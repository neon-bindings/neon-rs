use neon::prelude::*;

use neon::types::buffer::TypedArray;
use file_format::FileFormat;

fn sniff_bytes(mut cx: FunctionContext) -> JsResult<JsObject> {
    let buffer: Handle<JsArrayBuffer> = cx.argument(0)?;
    let format = {
        let bytes = buffer.as_slice(&cx);
        FileFormat::from_bytes(bytes)
    };
    let result = cx.empty_object();
    let name = cx.string(format.name());
    result.set(&mut cx, "name", name)?;
    match format.short_name() {
        Some(short_name) => {
            let short_name = cx.string(short_name);
            result.set(&mut cx, "shortName", short_name)?;
        }
        None => {
            let short_name = cx.null();
            result.set(&mut cx, "shortName", short_name)?;
        }
    }
    let media_type = cx.string(format.media_type());
    result.set(&mut cx, "mediaType", media_type)?;
    let ext = cx.string(format.extension());
    result.set(&mut cx, "extension", ext)?;
    Ok(result)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("sniffBytes", sniff_bytes)?;
    Ok(())
}
