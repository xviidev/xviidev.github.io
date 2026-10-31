#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_both_sites_and_rejects_missing_or_foreign_origins() {
        let allowed: Vec<String> = DEFAULT_ORIGINS.iter().map(|v| v.to_string()).collect();
        for origin in DEFAULT_ORIGINS { assert!(authorize(Some(origin), &allowed).is_ok()); }
        for origin in [None, Some("null"), Some("https://example.org"), Some("https://xvii.dev.evil.test"), Some("http://xvii.dev")] {
            assert_eq!(authorize(origin, &allowed).unwrap_err().0, 403);
        }
    }
    #[test]
    fn rejects_invalid_jobs() {
        let mut job = Job {
            printer: "Test".into(),
            width_mm: 50.0,
            height_mm: 30.0,
            pages: vec![],
        };
        assert!(validate(&job).is_err());
        job.pages.push("JVBERi0=".into());
        assert!(validate(&job).is_err());
        job.width_mm = f64::NAN;
        assert!(validate(&job).is_err());
    }
}
