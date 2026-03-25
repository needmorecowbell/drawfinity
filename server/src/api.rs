use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::room::RoomManager;

/// Maximum allowed length for room names.
const MAX_ROOM_NAME_LEN: usize = 200;
/// Maximum allowed length for creator names.
const MAX_CREATOR_NAME_LEN: usize = 100;

/// JSON response for a room in the listing.
#[derive(Debug, Serialize, Deserialize)]
pub struct RoomInfoResponse {
    pub id: String,
    pub name: Option<String>,
    pub client_count: usize,
    pub created_at: u64,
    pub last_active_at: u64,
}

/// Request body for creating a new room.
#[derive(Debug, Deserialize)]
pub struct CreateRoomRequest {
    pub name: Option<String>,
    pub creator_name: Option<String>,
}

/// `GET /api/rooms` — list all rooms.
pub async fn list_rooms(
    State(room_manager): State<Arc<RoomManager>>,
) -> Json<Vec<RoomInfoResponse>> {
    let rooms = room_manager.list_rooms().await;
    let response: Vec<RoomInfoResponse> = rooms
        .into_iter()
        .map(|(meta, client_count)| RoomInfoResponse {
            id: meta.id,
            name: meta.name,
            client_count,
            created_at: meta.created_at,
            last_active_at: meta.last_active_at,
        })
        .collect();
    Json(response)
}

/// `GET /api/rooms/{room_id}` — get a single room's details.
pub async fn get_room(
    Path(room_id): Path<String>,
    State(room_manager): State<Arc<RoomManager>>,
) -> impl IntoResponse {
    match room_manager.get_room_info(&room_id).await {
        Some((meta, client_count)) => Ok(Json(RoomInfoResponse {
            id: meta.id,
            name: meta.name,
            client_count,
            created_at: meta.created_at,
            last_active_at: meta.last_active_at,
        })),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// `POST /api/rooms` — create a new named room.
pub async fn create_room(
    State(room_manager): State<Arc<RoomManager>>,
    Json(body): Json<CreateRoomRequest>,
) -> impl IntoResponse {
    // Validate name length
    if let Some(ref name) = body.name {
        if name.len() > MAX_ROOM_NAME_LEN {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("name must be at most {} characters", MAX_ROOM_NAME_LEN)
                })),
            ));
        }
    }

    // Validate creator_name length
    if let Some(ref creator_name) = body.creator_name {
        if creator_name.len() > MAX_CREATOR_NAME_LEN {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("creator_name must be at most {} characters", MAX_CREATOR_NAME_LEN)
                })),
            ));
        }
    }

    let meta = room_manager
        .create_named_room(body.name, body.creator_name)
        .await;
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": meta.id,
            "name": meta.name,
            "client_count": 0,
            "created_at": meta.created_at,
            "last_active_at": meta.last_active_at,
        })),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persistence::Persistence;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::get,
        Router,
    };
    use tempfile::TempDir;
    use tower::ServiceExt;

    fn test_app(room_manager: Arc<RoomManager>) -> Router {
        Router::new()
            .route("/api/rooms", get(list_rooms).post(create_room))
            .route("/api/rooms/:room_id", get(get_room))
            .with_state(room_manager)
    }

    async fn setup() -> (TempDir, Arc<RoomManager>) {
        let dir = TempDir::new().unwrap();
        let p = Arc::new(Persistence::new(dir.path().to_path_buf()));
        p.init().await.unwrap();
        let rm = Arc::new(RoomManager::new(p));
        (dir, rm)
    }

    #[tokio::test]
    async fn test_list_rooms_empty() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/rooms")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let rooms: Vec<RoomInfoResponse> = serde_json::from_slice(&body).unwrap();
        assert!(rooms.is_empty());
    }

    #[tokio::test]
    async fn test_list_rooms_with_rooms() {
        let (_dir, rm) = setup().await;
        rm.join_room("room-a").await;
        rm.join_room("room-b").await;
        rm.join_room("room-b").await;

        let app = test_app(rm);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/rooms")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let rooms: Vec<RoomInfoResponse> = serde_json::from_slice(&body).unwrap();
        assert_eq!(rooms.len(), 2);

        let room_b = rooms.iter().find(|r| r.id == "room-b").unwrap();
        assert_eq!(room_b.client_count, 2);
    }

    #[tokio::test]
    async fn test_get_room_exists() {
        let (_dir, rm) = setup().await;
        rm.join_room("detail-room").await;

        // Set name on the room
        {
            let room = rm.get_or_create_room("detail-room").await;
            let mut guard = room.write().await;
            guard.name = Some("My Drawing".to_string());
        }

        let app = test_app(rm);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/rooms/detail-room")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let room: RoomInfoResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(room.id, "detail-room");
        assert_eq!(room.name, Some("My Drawing".to_string()));
        assert_eq!(room.client_count, 1);
    }

    #[tokio::test]
    async fn test_get_room_not_found() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/rooms/nonexistent")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_create_room_with_name() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        r#"{"name": "Team Sketch", "creator_name": "Alice"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let room: RoomInfoResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(room.name, Some("Team Sketch".to_string()));
        assert_eq!(room.client_count, 0);
        assert!(!room.id.is_empty());
        assert!(room.created_at > 0);
    }

    #[tokio::test]
    async fn test_create_room_minimal() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let room: RoomInfoResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(room.name, None);
        assert!(!room.id.is_empty());
    }

    #[tokio::test]
    async fn test_create_room_name_too_long() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let long_name = "x".repeat(201);
        let body_json = serde_json::json!({"name": long_name});

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(body_json.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let err: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(err["error"].as_str().unwrap().contains("name"));
    }

    #[tokio::test]
    async fn test_create_room_name_at_max_length() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let max_name = "x".repeat(200);
        let body_json = serde_json::json!({"name": max_name});

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(body_json.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
    }

    #[tokio::test]
    async fn test_create_room_creator_name_too_long() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let long_creator = "y".repeat(101);
        let body_json = serde_json::json!({"name": "ok", "creator_name": long_creator});

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(body_json.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let err: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(err["error"].as_str().unwrap().contains("creator_name"));
    }

    #[tokio::test]
    async fn test_create_room_creator_name_at_max_length() {
        let (_dir, rm) = setup().await;
        let app = test_app(rm);

        let max_creator = "y".repeat(100);
        let body_json = serde_json::json!({"name": "ok", "creator_name": max_creator});

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(body_json.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
    }

    #[tokio::test]
    async fn test_create_room_then_list() {
        let (_dir, rm) = setup().await;
        let app = test_app(Arc::clone(&rm));

        // Create a room
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"name": "Listed Room"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        // List rooms — should include the created room
        let app2 = test_app(rm);
        let response = app2
            .oneshot(
                Request::builder()
                    .uri("/api/rooms")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let rooms: Vec<RoomInfoResponse> = serde_json::from_slice(&body).unwrap();
        assert_eq!(rooms.len(), 1);
        assert_eq!(rooms[0].name, Some("Listed Room".to_string()));
    }
}
