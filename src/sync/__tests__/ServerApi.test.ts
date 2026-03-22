import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchRooms,
  fetchRoom,
  createRoom,
  ServerApiError,
} from "../ServerApi";
import type { RoomInfo } from "../ServerApi";

function mockResponse(
  body: unknown,
  init: { status?: number; statusText?: string; contentType?: string } = {},
): Response {
  const { status = 200, statusText = "OK", contentType = "application/json" } =
    init;
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": contentType },
  });
}

const SAMPLE_RAW_ROOM = {
  id: "room-1",
  name: "Test Room",
  client_count: 3,
  created_at: 1710000000,
  last_active_at: 1710001000,
};

const EXPECTED_ROOM: RoomInfo = {
  id: "room-1",
  name: "Test Room",
  clientCount: 3,
  createdAt: 1710000000,
  lastActiveAt: 1710001000,
};

describe("ServerApi", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchRooms", () => {
    it("returns mapped room list", async () => {
      fetchSpy.mockResolvedValue(mockResponse([SAMPLE_RAW_ROOM]));

      const rooms = await fetchRooms("http://localhost:3000");

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(fetchSpy.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/rooms",
      );
      expect(rooms).toEqual([EXPECTED_ROOM]);
    });

    it("converts ws:// URL to http://", async () => {
      fetchSpy.mockResolvedValue(mockResponse([]));

      await fetchRooms("ws://localhost:3000");

      expect(fetchSpy.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/rooms",
      );
    });

    it("converts wss:// URL to https://", async () => {
      fetchSpy.mockResolvedValue(mockResponse([]));

      await fetchRooms("wss://example.com/");

      expect(fetchSpy.mock.calls[0][0]).toBe(
        "https://example.com/api/rooms",
      );
    });

    it("strips trailing slashes from server URL", async () => {
      fetchSpy.mockResolvedValue(mockResponse([]));

      await fetchRooms("http://localhost:3000///");

      expect(fetchSpy.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/rooms",
      );
    });

    it("throws ServerApiError on HTTP error", async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({}, { status: 500, statusText: "Internal Server Error" }),
      );

      await expect(fetchRooms("http://localhost:3000")).rejects.toThrow(
        ServerApiError,
      );
      await expect(fetchRooms("http://localhost:3000")).rejects.toThrow(
        "Failed to fetch rooms",
      );
    });

    it("throws ServerApiError on non-JSON response", async () => {
      fetchSpy.mockResolvedValue(
        new Response("Not JSON", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      );

      await expect(fetchRooms("http://localhost:3000")).rejects.toThrow(
        "non-JSON",
      );
    });

    it("throws ServerApiError on network failure", async () => {
      fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(fetchRooms("http://localhost:3000")).rejects.toThrow(
        ServerApiError,
      );
    });

    it("throws ServerApiError on timeout", async () => {
      fetchSpy.mockImplementation(
        (_url: string | URL | Request, init?: RequestInit) => {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        },
      );

      vi.useFakeTimers();
      const promise = fetchRooms("http://localhost:3000");
      // Catch the promise early to prevent unhandled rejection
      const caught = promise.catch((e: Error) => e);
      await vi.advanceTimersByTimeAsync(10_000);

      const error = await caught;
      expect(error).toBeInstanceOf(ServerApiError);
      expect((error as Error).message).toContain("timed out");
      vi.useRealTimers();
    });
  });

  describe("fetchRoom", () => {
    it("returns mapped room detail", async () => {
      fetchSpy.mockResolvedValue(mockResponse(SAMPLE_RAW_ROOM));

      const room = await fetchRoom("http://localhost:3000", "room-1");

      expect(fetchSpy.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/rooms/room-1",
      );
      expect(room).toEqual(EXPECTED_ROOM);
    });

    it("encodes room ID in URL", async () => {
      fetchSpy.mockResolvedValue(mockResponse(SAMPLE_RAW_ROOM));

      await fetchRoom("http://localhost:3000", "room/with spaces");

      expect(fetchSpy.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/rooms/room%2Fwith%20spaces",
      );
    });

    it("throws on 404", async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({}, { status: 404, statusText: "Not Found" }),
      );

      const err = await fetchRoom("http://localhost:3000", "missing").catch(
        (e: Error) => e,
      );
      expect(err).toBeInstanceOf(ServerApiError);
      expect((err as ServerApiError).statusCode).toBe(404);
    });
  });

  describe("createRoom", () => {
    it("creates a room with name and user", async () => {
      fetchSpy.mockResolvedValue(
        mockResponse(SAMPLE_RAW_ROOM, { status: 201, statusText: "Created" }),
      );

      const room = await createRoom(
        "http://localhost:3000",
        "Test Room",
        "Alice",
      );

      expect(fetchSpy.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/rooms",
      );
      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(requestInit.method).toBe("POST");
      expect(JSON.parse(requestInit.body as string)).toEqual({
        name: "Test Room",
        creator_name: "Alice",
      });
      expect(room).toEqual(EXPECTED_ROOM);
    });

    it("creates a room without user name", async () => {
      fetchSpy.mockResolvedValue(
        mockResponse(
          { ...SAMPLE_RAW_ROOM, name: "Solo Room" },
          { status: 201, statusText: "Created" },
        ),
      );

      await createRoom("http://localhost:3000", "Solo Room");

      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);
      expect(body.name).toBe("Solo Room");
      expect(body.creator_name).toBeUndefined();
    });

    it("throws on server error", async () => {
      fetchSpy.mockResolvedValue(
        mockResponse(
          {},
          { status: 500, statusText: "Internal Server Error" },
        ),
      );

      await expect(
        createRoom("http://localhost:3000", "Fail Room"),
      ).rejects.toThrow(ServerApiError);
    });
  });
});
