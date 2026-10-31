#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn requires_token_and_rejects_other_origins() {
        assert!(authorize(Some("https://app.test"), Some("Bearer secret"), "https://app.test", "Bearer secret").is_ok());
        assert_eq!(authorize(None, None, "https://app.test", "Bearer secret").unwrap_err().0, 401);
        assert_eq!(authorize(Some("https://other.test"), Some("Bearer secret"), "https://app.test", "Bearer secret").unwrap_err().0, 403);
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
