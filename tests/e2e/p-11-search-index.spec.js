const { test, expect } = require("./fixtures");

test.describe("P-11 Search index", () => {
  test("index.json returns array with items", async ({ request }) => {
    const res = await request.get("/index.json");
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
  });
});
