fn validate(job: &Job) -> Result<(), Error> {
    if job.printer.trim().is_empty() || job.printer.len() > 512 {
        return Err(bad("Printer tidak valid."));
    }
    if ![job.width_mm, job.height_mm]
        .iter()
        .all(|v| v.is_finite() && *v >= 5.0 && *v <= 1000.0)
    {
        return Err(bad("Ukuran kertas harus 5–1.000 mm."));
    }
    if job.pages.is_empty() || job.pages.len() > 100 {
        return Err(bad("Kirim 1–100 halaman per pekerjaan."));
    }
    for page in &job.pages {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(page)
            .map_err(|_| bad("Gambar tidak valid."))?;
        // Bound decoded raster dimensions before handing images to the OS decoder.
        if bytes.len() < 24 || &bytes[..8] != b"\x89PNG\r\n\x1a\n" {
            return Err(bad("Halaman harus PNG."));
        }
        let w = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
        let h = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
        if w == 0 || h == 0 || u64::from(w) * u64::from(h) > 40_000_000 {
            return Err(bad("Resolusi gambar terlalu besar."));
        }
    }
    Ok(())
}
