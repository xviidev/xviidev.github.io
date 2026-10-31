mod backend;
use base64::Engine;
use serde::{Deserialize, Serialize};
use tiny_http::{Header, Method, Response, Server, StatusCode};
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Job {
    printer: String,
    width_mm: f64,
    height_mm: f64,
    pages: Vec<String>,
}
type Error = (u16, String);
fn bad(message: &str) -> Error {
    (400, message.into())
}
include!("validation.rs");
fn header<'a>(r: &'a tiny_http::Request, name: &str) -> Option<&'a str> {
    r.headers()
        .iter()
        .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case(name))
        .map(|h| h.value.as_str())
}
fn authorize(
    origin: Option<&str>,
    token: Option<&str>,
    allowed: &str,
    bearer: &str,
) -> Result<(), Error> {
    if origin.is_some_and(|v| v != allowed) {
        return Err((403, "Origin ditolak.".into()));
    }
    if token != Some(bearer) {
        return Err((401, "Token tidak cocok.".into()));
    }
    Ok(())
}
fn handle(
    r: &mut tiny_http::Request,
    origin: &str,
    bearer: &str,
) -> Result<serde_json::Value, Error> {
    authorize(
        header(r, "Origin"),
        header(r, "Authorization"),
        origin,
        bearer,
    )?;
    match (r.method(), r.url()) {
        (&Method::Get, "/v1/info") => Ok(backend::info()),
        (&Method::Get, "/v1/printers") => Ok(serde_json::json!(backend::printers()?)),
        (&Method::Post, "/v1/jobs") => {
            if header(r, "Content-Type").map(|s| s.split(';').next().unwrap().trim())
                != Some("application/json")
            {
                return Err((415, "Gunakan application/json.".into()));
            }
            use std::io::Read;
            let limit = 32 * 1024 * 1024;
            let mut bytes = Vec::new();
            r.as_reader()
                .take(limit + 1)
                .read_to_end(&mut bytes)
                .map_err(|e| bad(&e.to_string()))?;
            if bytes.len() as u64 > limit {
                return Err((413, "Pekerjaan melebihi 32 MiB.".into()));
            }
            let job: Job =
                serde_json::from_slice(&bytes).map_err(|_| bad("Pekerjaan tidak valid."))?;
            validate(&job)?;
            backend::print(&job)?;
            Ok(serde_json::json!({"status":"submitted"}))
        }
        _ => Err((404, "Endpoint tidak tersedia.".into())),
    }
}
fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let origin =
        std::env::var("XVII_PRINT_ORIGIN").unwrap_or_else(|_| "https://xviidev.github.io".into());
    let cors = Header::from_bytes("Access-Control-Allow-Origin", origin.as_str())
        .map_err(|_| "Origin tidak valid")?;
    let token = uuid::Uuid::new_v4().to_string();
    let bearer = format!("Bearer {token}");
    let server = Server::http("127.0.0.1:17831")?;
    println!(
        "Agen cetak ({}) — http://127.0.0.1:17831\nToken koneksi: {token}",
        std::env::consts::OS
    );
    // Process one submission at a time, without automatic retries.
    for mut r in server.incoming_requests() {
        let (status, body) = if r.method() == &Method::Options {
            if header(&r, "Origin") == Some(origin.as_str()) {
                (204, String::new())
            } else {
                (403, "Origin ditolak.".into())
            }
        } else {
            match handle(&mut r, &origin, &bearer) {
                Ok(v) => (200, v.to_string()),
                Err(e) => e,
            }
        };
        let response = Response::from_string(body)
            .with_status_code(StatusCode(status))
            .with_header(cors.clone())
            .with_header(Header::from_bytes("Vary", "Origin").unwrap())
            .with_header(Header::from_bytes("Access-Control-Allow-Methods", "GET, POST").unwrap())
            .with_header(
                Header::from_bytes(
                    "Access-Control-Allow-Headers",
                    "authorization, content-type",
                )
                .unwrap(),
            )
            .with_header(
                Header::from_bytes(
                    "Content-Type",
                    if status == 200 {
                        "application/json"
                    } else {
                        "text/plain; charset=utf-8"
                    },
                )
                .unwrap(),
            );
        let _ = r.respond(response);
    }
    Ok(())
}
include!("tests.rs");
