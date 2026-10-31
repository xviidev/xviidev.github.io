use crate::{Error, Job};
use base64::Engine;
use std::{
    path::Path,
    process::{Command, Stdio},
};

fn run(command: &mut Command) -> Result<String, Error> {
    command.stdin(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command
        .output()
        .map_err(|e| (502, format!("Backend cetak tidak tersedia: {e}")))?;
    if !output.status.success() {
        return Err((502, String::from_utf8_lossy(&output.stderr).trim().into()));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .trim_start_matches('\u{feff}')
        .trim()
        .into())
}
fn powershell(mode: &str, path: &Path) -> Result<String, Error> {
    run(Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            include_str!("print.ps1"),
        ])
        .env("XVII_PRINT_MODE", mode)
        .env("XVII_PRINT_JOB", path))
}
pub fn info() -> serde_json::Value {
    let version = if cfg!(windows) {
        powershell("version", Path::new("")).ok()
    } else {
        run(Command::new("uname").arg("-r")).ok()
    };
    serde_json::json!({"os":std::env::consts::OS,"arch":std::env::consts::ARCH,"os_version":version,"version":env!("CARGO_PKG_VERSION"),"backend":if cfg!(windows) {"windows-printdocument"} else {"cups"}})
}
fn cups_printers(output: &str) -> Vec<String> {
    output
        .lines()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect()
}
pub fn printers() -> Result<Vec<String>, Error> {
    if cfg!(windows) {
        serde_json::from_str(&powershell("printers", Path::new(""))?)
            .map_err(|_| (502, "Daftar printer gagal dibaca.".into()))
    } else if cfg!(any(target_os = "linux", target_os = "macos")) {
        Ok(cups_printers(&run(Command::new("lpstat")
            .arg("-e")
            .env("LC_ALL", "C"))?))
    } else {
        Err((501, "Sistem operasi belum didukung.".into()))
    }
}
fn cups_args(job: &Job) -> Vec<String> {
    vec![
        "-d".into(),
        job.printer.clone(),
        "-t".into(),
        "Label XVII Dev".into(),
        "-o".into(),
        format!("media=Custom.{}x{}mm", job.width_mm, job.height_mm),
        "-o".into(),
        "ppi=300".into(),
        "-o".into(),
        "print-scaling=none".into(),
        "-o".into(),
        "orientation-requested=3".into(),
        "-o".into(),
        "sides=one-sided".into(),
    ]
}
pub fn print(job: &Job) -> Result<(), Error> {
    // Use an installed destination, never interpret user input as command options.
    if !printers()?.contains(&job.printer) {
        return Err((400, "Printer tidak tersedia.".into()));
    }
    let dir = tempfile::tempdir().map_err(|e| (500, e.to_string()))?;
    if cfg!(windows) {
        let path = dir.path().join("job.json");
        std::fs::write(&path, serde_json::to_vec(job).unwrap())
            .map_err(|e| (500, e.to_string()))?;
        powershell("print", &path)?;
    } else if cfg!(any(target_os = "linux", target_os = "macos")) {
        let mut command = Command::new("lp");
        command.args(cups_args(job));
        for (i, page) in job.pages.iter().enumerate() {
            let path = dir.path().join(format!("page-{i:03}.png"));
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(page)
                .map_err(|_| (400, "PNG tidak valid.".into()))?;
            std::fs::write(&path, bytes).map_err(|e| (500, e.to_string()))?;
            command.arg(path);
        }
        run(&mut command)?;
    } else {
        return Err((501, "Sistem operasi belum didukung.".into()));
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parses_destinations_without_localized_status() {
        assert_eq!(
            cups_printers("Zebra\n\nEPSON_L360\n"),
            vec!["Zebra", "EPSON_L360"]
        );
        assert!(cups_printers("").is_empty());
    }
    #[test]
    fn preserves_printer_as_one_argument_and_disables_scaling() {
        let job = Job {
            printer: "Printer name; echo test".into(),
            width_mm: 50.0,
            height_mm: 30.0,
            pages: vec![],
        };
        let args = cups_args(&job);
        assert_eq!(args[1], job.printer);
        assert!(args.contains(&"media=Custom.50x30mm".into()));
        assert!(args.contains(&"ppi=300".into()));
        assert!(args.contains(&"print-scaling=none".into()));
    }
}
