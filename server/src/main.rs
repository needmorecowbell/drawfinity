mod persistence;
mod room;
mod ws;

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::{routing::get, Router};
use clap::Parser;
use tower_http::cors::CorsLayer;

use persistence::Persistence;
use room::RoomManager;

/// Drawfinity collaboration server — WebSocket relay with room persistence.
#[derive(Parser, Debug)]
#[command(name = "drawfinity-server")]
struct Args {
    /// Directory for persisting room document state.
    #[arg(long, env = "DRAWFINITY_DATA_DIR", default_value = "./data")]
    data_dir: PathBuf,

    /// Port to listen on.
    #[arg(long, env = "DRAWFINITY_PORT", default_value_t = 8080)]
    port: u16,
}

async fn health() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    let persistence = Arc::new(Persistence::new(args.data_dir));
    persistence.init().await.expect("Failed to create data directory");

    let room_manager = Arc::new(RoomManager::new(persistence));

    let app = Router::new()
        .route("/health", get(health))
        .route("/ws/{room_id}", get(ws::ws_handler))
        .layer(CorsLayer::permissive())
        .with_state(room_manager);

    let addr = SocketAddr::from(([0, 0, 0, 0], args.port));
    println!("Drawfinity collaboration server listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
