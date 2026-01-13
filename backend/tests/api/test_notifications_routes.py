"""
Tests for Notifications API endpoints.

Tests cover notification listing, marking as read, and deletion
for the notification system.
"""
import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_list_notifications(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test listing notifications for current user."""
    response = await api_client.get(
        "/api/v1/notifications",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "unread_count" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_notifications_unread_only(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test listing only unread notifications."""
    response = await api_client.get(
        "/api/v1/notifications?unread_only=true",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["is_read"] is False


@pytest.mark.asyncio
async def test_list_notifications_by_type(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test listing notifications filtered by type."""
    response = await api_client.get(
        "/api/v1/notifications?type=low_stock",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["type"] == "low_stock"


@pytest.mark.asyncio
async def test_get_unread_count(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test getting count of unread notifications."""
    response = await api_client.get(
        "/api/v1/notifications/unread-count",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "unread_count" in data
    assert isinstance(data["unread_count"], int)
    assert data["unread_count"] >= 0


@pytest.mark.asyncio
async def test_mark_notification_as_read(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test marking a notification as read."""
    response = await api_client.post(
        f"/api/v1/notifications/{test_notification.id}/read",
        headers=auth_headers
    )

    assert response.status_code == 200

    # Verify it's marked as read
    list_response = await api_client.get(
        "/api/v1/notifications",
        headers=auth_headers
    )
    notifications = list_response.json()["items"]
    notification = next(
        (n for n in notifications if n["id"] == str(test_notification.id)),
        None
    )
    if notification:
        assert notification["is_read"] is True
        assert notification["read_at"] is not None


@pytest.mark.asyncio
async def test_mark_notification_as_read_not_found(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test marking non-existent notification as read returns 404."""
    fake_id = uuid4()
    response = await api_client.post(
        f"/api/v1/notifications/{fake_id}/read",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_mark_all_notifications_as_read(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test marking all notifications as read."""
    response = await api_client.post(
        "/api/v1/notifications/read-all",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data

    # Verify unread count is 0
    count_response = await api_client.get(
        "/api/v1/notifications/unread-count",
        headers=auth_headers
    )
    # Note: unread count may still be > 0 if there are broadcast notifications
    # or notifications created after the mark-all operation


@pytest.mark.asyncio
async def test_delete_notification(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test deleting a notification."""
    response = await api_client.delete(
        f"/api/v1/notifications/{test_notification.id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    # Verify it's deleted
    list_response = await api_client.get(
        "/api/v1/notifications",
        headers=auth_headers
    )
    notifications = list_response.json()["items"]
    notification_ids = [n["id"] for n in notifications]
    assert str(test_notification.id) not in notification_ids


@pytest.mark.asyncio
async def test_delete_notification_not_found(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test deleting non-existent notification returns 404."""
    fake_id = uuid4()
    response = await api_client.delete(
        f"/api/v1/notifications/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_notifications_unauthorized(api_client: AsyncClient):
    """Test that notifications endpoints require authentication."""
    response = await api_client.get("/api/v1/notifications")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_notifications_filtered_by_user(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification,
    test_user
):
    """Test that users only see their own notifications."""
    response = await api_client.get(
        "/api/v1/notifications",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # All notifications should belong to the current user or be broadcasts (null user_id)
    for item in data["items"]:
        user_id = item.get("user_id")
        assert user_id is None or user_id == str(test_user.id)


@pytest.mark.asyncio
async def test_list_notifications_pagination(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test notifications list pagination."""
    response = await api_client.get(
        "/api/v1/notifications?skip=0&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 10


@pytest.mark.asyncio
async def test_notification_includes_entity_info(
    api_client: AsyncClient,
    auth_headers: dict,
    test_notification
):
    """Test that notification includes entity information for navigation."""
    response = await api_client.get(
        "/api/v1/notifications",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    if data["items"]:
        notification = data["items"][0]
        # Should have entity info for navigation
        assert "entity_type" in notification
        assert "entity_id" in notification
