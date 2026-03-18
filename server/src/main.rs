mod room;
mod ws;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{routing::get, Router};
use tower_http::cors::CorsLayer;

use room::RoomManager;

async fn health() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let room_manager = Arc::new(RoomManager::new());

    let app = Router::new()
        .route("/health", get(health))
        .route("/ws/{room_id}", get(ws::ws_handler))
        .layer(CorsLayer::permissive())
        .with_state(room_manager);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Drawfinity collaboration server listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
