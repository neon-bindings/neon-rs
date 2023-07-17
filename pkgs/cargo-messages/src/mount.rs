use std::path::Path;

use cargo_metadata::MetadataCommand;

#[derive(Clone)]
pub(crate) struct MountInfo {
    pub(crate) mount: String,
    pub(crate) manifest_path: Option<String>
}

impl MountInfo {
    // FIXME: super sloppy, clean up the unwraps and lossy conversions
    pub(crate) fn unmount(&self, filename: String) -> String {
        let mounted_path = Path::new(&filename);
        let mounted_base = Path::new(&self.mount);
        let rel_path = pathdiff::diff_paths(mounted_path, mounted_base).unwrap();
        let mut cmd = MetadataCommand::new();
        if let Some(manifest_path) = &self.manifest_path {
            cmd.manifest_path(manifest_path);
        }
        cmd.no_deps();
        let metadata = cmd.exec().unwrap();
        let host_base = Path::new(&metadata.target_directory);
        host_base.join(rel_path).into_os_string().into_string().unwrap()
    }
}
