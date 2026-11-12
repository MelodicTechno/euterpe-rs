use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn read_file_bytes(path: &Path) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|error| format!("无法读取文件 {}：{error}", path.display()))
}

pub fn write_text_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let parent: PathBuf = match path.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent.to_path_buf(),
        _ => PathBuf::from("."),
    };

    let file_name = path
        .file_name()
        .ok_or_else(|| "保存路径缺少文件名".to_string())?;

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let temp_path = parent.join(format!(
        ".{}.{}.{}.tmp",
        file_name.to_string_lossy(),
        std::process::id(),
        nonce
    ));

    let write_result = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp_path)
        .and_then(|mut file| {
            file.write_all(contents.as_bytes())?;
            file.sync_all()
        });

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("写入临时文件失败：{error}"));
    }

    if let Err(error) = fs::rename(&temp_path, path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("替换目标文件失败：{error}"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_dir(label: &str) -> PathBuf {
        let nonce = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!(
            "srt-tool-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn reads_chinese_and_space_path() {
        let dir = temp_dir("read");
        let path = dir.join("测试 歌词 文件.txt");
        fs::write(&path, "第一行\n第二行").expect("write fixture");

        let bytes = read_file_bytes(&path).expect("read file");

        assert_eq!(String::from_utf8(bytes).expect("utf8"), "第一行\n第二行");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn write_text_atomic_overwrites_existing_file() {
        let dir = temp_dir("overwrite");
        let path = dir.join("song.srt");

        write_text_atomic(&path, "旧内容").expect("first write");
        write_text_atomic(&path, "新内容\r\n").expect("second write");

        assert_eq!(fs::read_to_string(&path).expect("read back"), "新内容\r\n");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn failed_replace_keeps_existing_target_intact() {
        let dir = temp_dir("preserve");
        let target = dir.join("lyrics.srt");
        fs::create_dir(&target).expect("make target directory");
        fs::write(target.join("marker.txt"), "keep me").expect("marker");

        let result = write_text_atomic(&target, "new content");

        assert!(result.is_err());
        assert_eq!(
            fs::read_to_string(target.join("marker.txt")).expect("marker survives"),
            "keep me"
        );
        let leftover_temp = fs::read_dir(&dir)
            .expect("list dir")
            .filter_map(Result::ok)
            .any(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"));
        assert!(!leftover_temp, "temp file should be cleaned up");
        fs::remove_dir_all(&dir).ok();
    }
}
