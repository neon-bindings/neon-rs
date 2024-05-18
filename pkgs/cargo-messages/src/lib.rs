mod mount;

use neon::prelude::*;
use std::{io::{BufReader, ErrorKind, Stdin, stdin}, cell::RefCell, fs::File, thread, time::Duration};
use cargo_metadata::{Artifact, Message, MessageIter};
use mount::{MountInfo};
use serde::de::Deserialize;

#[derive(Clone)]
struct Options {
    mount_info: Option<MountInfo>,
    verbose: bool,
}

impl Options {
    fn mount_info(&self) -> &Option<MountInfo> {
        &self.mount_info
    }

    fn verbose(&self) -> bool {
        self.verbose
    }

    fn unmount(&self, filename: String) -> String {
        match &self.mount_info {
            Some(mount_info) => mount_info.unmount(filename),
            None => filename,
        }
    }
}

struct CargoReader {
    options: Options,
}

impl Finalize for CargoReader { }

struct CompilerArtifact {
    options: Options,
    artifact: Artifact,
}

impl Finalize for CompilerArtifact { }

impl CompilerArtifact {
    fn crate_name(&self) -> &str {
        &self.artifact.target.name
    }

    fn find_file_by_crate_type(&self, crate_type: String) -> Option<String> {
        match self.artifact.target.crate_types.iter().position(|ct| *ct == crate_type) {
            Some(i) => { Some(self.options.unmount(self.artifact.filenames[i].to_string())) }
            None => { None }
        }
    }
}

struct CompilerMessage {
    options: Options,
    message: cargo_metadata::CompilerMessage,
}

impl Finalize for CompilerMessage { }

struct BuildScriptExecuted {
    options: Options,
    script: cargo_metadata::BuildScript,
}

impl Finalize for BuildScriptExecuted { }

struct BuildFinished {
    options: Options,
    finished: cargo_metadata::BuildFinished,
}

impl Finalize for BuildFinished { }

struct TextLine {
    options: Options,
    line: String,
}

impl Finalize for TextLine { }

fn parse_message(line: &str) -> Message {
    let mut deserializer = serde_json::Deserializer::from_str(line);
    deserializer.disable_recursion_limit();
    Message::deserialize(&mut deserializer).unwrap_or(Message::TextLine(line.to_string()))
}

fn readline(mut cx: FunctionContext) -> JsResult<JsObject> {
    let reader: Handle<Boxed<CargoReader>> = cx.argument(0)?;
    let reader = reader.borrow();
    let line: Handle<JsString> = cx.argument(1)?;
    let line = line.value(&mut cx);

    let message = parse_message(&line);
    let options = reader.options.clone();
    let result = cx.empty_object();

    match message {
        Message::CompilerArtifact(artifact) => {
            let kernel = cx.boxed(RefCell::new(CompilerArtifact { options, artifact }));
            let kind = cx.number(0);
            result.set(&mut cx, "kernel", kernel)?;
            result.set(&mut cx, "kind", kind)?;
        }
        Message::CompilerMessage(message) => {
            let kernel = cx.boxed(RefCell::new(CompilerMessage { options, message }));
            let kind = cx.number(1);
            result.set(&mut cx, "kernel", kernel)?;
            result.set(&mut cx, "kind", kind)?;
        }
        Message::BuildScriptExecuted(script) => {
            let kernel = cx.boxed(RefCell::new(BuildScriptExecuted { options, script }));
            let kind = cx.number(2);
            result.set(&mut cx, "kernel", kernel)?;
            result.set(&mut cx, "kind", kind)?;
        }
        Message::BuildFinished(finished) => {
            let kernel = cx.boxed(RefCell::new(BuildFinished { options, finished }));
            let kind = cx.number(3);
            result.set(&mut cx, "kernel", kernel)?;
            result.set(&mut cx, "kind", kind)?;
        }
        Message::TextLine(line) => {
            let kernel = cx.boxed(RefCell::new(TextLine { options, line }));
            let kind = cx.number(4);
            result.set(&mut cx, "kernel", kernel)?;
            result.set(&mut cx, "kind", kind)?;
        }
        _ => {
            let kernel = cx.boxed(RefCell::new(TextLine { options, line }));
            let kind = cx.number(4);
            result.set(&mut cx, "kernel", kernel)?;
            result.set(&mut cx, "kind", kind)?;
        }
    }

    Ok(result)
}

enum CargoMessages {
    FromStdin(MessageIter<BufReader<Stdin>>, Option<MountInfo>, bool),
    FromFile(MessageIter<BufReader<File>>, Option<MountInfo>, bool)
}

// Starting around Rust 1.78 or 1.79, cargo will begin normalizing
// crate names in the JSON output, so to support both old and new
// versions of cargo, we need to compare against both variants.
//
// See: https://github.com/rust-lang/cargo/issues/13867
fn normalize(crate_name: &str) -> String {
    crate_name.replace('-', "_")
}

impl CargoMessages {
    fn verbose(&self) -> bool {
        match self {
            CargoMessages::FromStdin(_, _, verbose) => *verbose,
            CargoMessages::FromFile(_, _, verbose) => *verbose,
        }
    }

    fn mount_info(&self) -> &Option<MountInfo> {
        match self {
            CargoMessages::FromStdin(_, mount_info, _) => mount_info,
            CargoMessages::FromFile(_, mount_info, _) => mount_info,
        }
    }

    fn from_stdin(mount_info: Option<MountInfo>, verbose: bool) -> Self {
        CargoMessages::FromStdin(
            Message::parse_stream(BufReader::new(stdin())),
            mount_info,
            verbose,
        )
    }

    fn from_file(file: File, mount_info: Option<MountInfo>, verbose: bool) -> Self {
        CargoMessages::FromFile(
            Message::parse_stream(BufReader::new(file)),
            mount_info,
            verbose,
        )
    }

    fn next(&mut self) -> Option<Result<Message, std::io::Error>> {
        match self {
            CargoMessages::FromStdin(messages, _, _) => messages.next(),
            CargoMessages::FromFile(messages, _, _) => messages.next()
        }
    }

    fn find_artifact(&mut self, crate_name: &str) -> Option<Artifact> {
        let mut count: u32 = 0;
        let mut result: Option<Artifact> = None;

        let normalized_crate_name = normalize(crate_name);

        while let Some(msg) = self.next() {
            match msg {
                Ok(Message::CompilerArtifact(artifact)) => {
                    count += 1;
                    if self.verbose() {
                        eprintln!("[cargo-messages] found artifact for {}", artifact.target.name);
                    }
                    if result.is_none() && normalize(&artifact.target.name) == normalized_crate_name {
                        result = Some(artifact);
                    }
                }
                Ok(Message::BuildFinished(cargo_metadata::BuildFinished { success, .. })) => {
                    if self.verbose() {
                        eprintln!("[cargo-messages] build finished ({})", if success { "succeeded" } else { "failed" });
                    }
                }
                Ok(_) => {
                    if self.verbose() {
                        eprintln!("[cargo-messages] skipping non-artifact message");
                    }
                }
                Err(err) if err.kind() == ErrorKind::WouldBlock => {
                    if self.verbose() {
                        eprintln!("[cargo-messages] metadata read error: resource temporarily unavailable");
                    }
                    thread::sleep(Duration::from_millis(100));
                }
                Err(err) => {
                    if self.verbose() {
                        eprintln!("[cargo-messages] metadata read error: {}", err);
                    }
                }
            }
        }
        if self.verbose() {
            eprintln!("[cargo-messages] no{} artifacts", if count == 0 { "" } else { " more" });
        }

        result
    }
}

impl Finalize for CargoMessages { }

struct CargoArtifact {
    artifact: Artifact,
    mount_info: Option<MountInfo>,
}

impl CargoArtifact {
    fn find_file_by_crate_type(&self, crate_type: String) -> Option<String> {
        let Self { artifact, .. } = self;
        match artifact.target.crate_types.iter().position(|ct| *ct == crate_type) {
            Some(i) => { Some(self.unmount(artifact.filenames[i].to_string())) }
            None => { None }
        }
    }

    fn unmount(&self, filename: String) -> String {
        match &self.mount_info {
            Some(mount_info) => mount_info.unmount(filename),
            None => filename,
        }
    }
}

impl Finalize for CargoArtifact { }

type Boxed<T> = JsBox<RefCell<T>>;

fn find_artifact(mut cx: FunctionContext) -> JsResult<JsValue> {
    let messages: Handle<Boxed<CargoMessages>> = cx.argument(0)?;
    let crate_name = cx.argument::<JsString>(1)?.value(&mut cx);
    let mut messages = messages.borrow_mut();
    Ok(match messages.find_artifact(&crate_name) {
        Some(artifact) => {
            let mount_info = messages.mount_info().clone();
            cx.boxed(RefCell::new(CargoArtifact { artifact, mount_info })).upcast()
        }
        None => { cx.null().upcast() }
    })
}

fn optional_string<'cx, C: Context<'cx>>(cx: &mut C, v: Handle<JsValue>) -> NeonResult<Option<String>> {
    if v.is_a::<JsNull, _>(cx) || v.is_a::<JsUndefined, _>(cx) {
        Ok(None)
    } else {
        let s = v.downcast_or_throw::<JsString, _>(cx)?.value(cx);
        Ok(Some(s))
    }
}

fn mount_info<'cx>(cx: &mut FunctionContext<'cx>, i: usize) -> NeonResult<Option<MountInfo>> {
    let mount = cx.argument::<JsValue>(i)?;
    let mount = optional_string(cx, mount)?;
    match mount {
        Some(mount) => {
            let manifest_path = cx.argument::<JsValue>(i + 1)?;
            let manifest_path = optional_string(cx, manifest_path)?;
            Ok(Some(MountInfo { mount, manifest_path }))
        }
        None => {
            Ok(None)
        }
    }
}

fn options<'cx>(cx: &mut FunctionContext<'cx>, i: usize) -> NeonResult<Options> {
    let mount_info = mount_info(cx, i)?;
    let verbose: Handle<JsValue> = cx.argument(i + 2)?;
    let t: Handle<JsBoolean> = cx.boolean(true);
    let verbose = verbose.strict_equals(cx, t);
    Ok(Options { mount_info, verbose })
}

fn find_file_by_crate_type(mut cx: FunctionContext) -> JsResult<JsValue> {
    let artifact: Handle<Boxed<CargoArtifact>> = cx.argument(0)?;
    let crate_type = cx.argument::<JsString>(1)?.value(&mut cx);
    let artifact = artifact.borrow();
    Ok(match artifact.find_file_by_crate_type(crate_type) {
        Some(filename) => cx.string(filename).upcast(),
        None => cx.null().upcast(),
    })
}

fn from_stdin(mut cx: FunctionContext) -> JsResult<Boxed<CargoMessages>> {
    let mount_info: Option<MountInfo> = mount_info(&mut cx, 0)?;
    let verbose: Handle<JsValue> = cx.argument(2)?;
    let t: Handle<JsBoolean> = cx.boolean(true);
    let verbose = verbose.strict_equals(&mut cx, t);
    Ok(cx.boxed(RefCell::new(CargoMessages::from_stdin(mount_info, verbose))))
}

fn from_file(mut cx: FunctionContext) -> JsResult<Boxed<CargoMessages>> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let mount_info = mount_info(&mut cx, 1)?;
    let file = File::open(filename).unwrap();
    let verbose: Handle<JsValue> = cx.argument(3)?;
    let t: Handle<JsBoolean> = cx.boolean(true);
    let verbose = verbose.strict_equals(&mut cx, t);
    Ok(cx.boxed(RefCell::new(CargoMessages::from_file(file, mount_info, verbose))))
}

fn create_reader(mut cx: FunctionContext) -> JsResult<Boxed<CargoReader>> {
    let options = options(&mut cx, 0)?;
    Ok(cx.boxed(RefCell::new(CargoReader { options })))
}

fn compiler_artifact_crate_name(mut cx: FunctionContext) -> JsResult<JsString> {
    let artifact: Handle<Boxed<CompilerArtifact>> = cx.argument(0)?;
    let artifact = artifact.borrow();
    Ok(cx.string(artifact.crate_name()))
}

fn compiler_artifact_find_file_by_crate_type(mut cx: FunctionContext) -> JsResult<JsValue> {
    let artifact: Handle<Boxed<CompilerArtifact>> = cx.argument(0)?;
    let crate_type = cx.argument::<JsString>(1)?.value(&mut cx);
    let artifact = artifact.borrow();
    Ok(match artifact.find_file_by_crate_type(crate_type) {
        Some(filename) => cx.string(filename).upcast(),
        None => cx.null().upcast(),
    })
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("fromStdin", from_stdin)?;
    cx.export_function("fromFile", from_file)?;
    cx.export_function("findArtifact", find_artifact)?;
    cx.export_function("findFileByCrateType", find_file_by_crate_type)?;
    cx.export_function("createReader", create_reader)?;
    cx.export_function("compilerArtifactCrateName", compiler_artifact_crate_name)?;
    cx.export_function("compilerArtifactFindFileByCrateType", compiler_artifact_find_file_by_crate_type)?;
    cx.export_function("readline", readline)?;
    Ok(())
}
