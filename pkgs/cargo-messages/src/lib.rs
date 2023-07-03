mod mount;

use neon::prelude::*;
use std::{io::{BufReader, Stdin, stdin}, cell::RefCell, fs::File};
use cargo_metadata::{Artifact, Message, MessageIter};
use mount::{MountInfo};

enum CargoMessages {
    FromStdin(MessageIter<BufReader<Stdin>>, Option<MountInfo>, bool),
    FromFile(MessageIter<BufReader<File>>, Option<MountInfo>, bool)
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
        loop {
            match self.next() {
                Some(Ok(Message::CompilerArtifact(artifact))) => {
                    count += 1;
                    if self.verbose() {
                        eprintln!("[cargo-messages] found artifact for {}", artifact.target.name);
                    }
                    if &artifact.target.name == crate_name {
                        return Some(artifact);
                    }
                }
                Some(Err(err)) => {
                    if self.verbose() {
                        eprintln!("[cargo-messages] parse error: {}", err);
                    }
                    break;
                }
                None => {
                    if self.verbose() {
                        eprintln!("[cargo-messages] no{} artifacts", if count == 0 { "" } else { " more" });
                    }
                    break;
                }
                _ => { continue; }
            }
        }
        None
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

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("fromStdin", from_stdin)?;
    cx.export_function("fromFile", from_file)?;
    cx.export_function("findArtifact", find_artifact)?;
    cx.export_function("findFileByCrateType", find_file_by_crate_type)?;
    Ok(())
}
