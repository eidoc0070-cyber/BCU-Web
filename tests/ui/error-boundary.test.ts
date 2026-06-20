import { expect, test, describe, beforeAll, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { UIErrorBoundary } from "../../src/editor/components/ErrorBoundary";

describe("UIErrorBoundary Unit Tests", () => {
    beforeAll(() => {
        try {
            GlobalRegistrator.register();
        } catch (e) {}
    });

    test("should render content if no error is thrown", () => {
        const container = document.createElement("div");
        let rendered = false;
        const boundary = new UIErrorBoundary(container, "TestComponent", () => {});

        boundary.run(() => {
            container.innerHTML = "<span>Success Content</span>";
            rendered = true;
        });

        expect(rendered).toBe(true);
        expect(container.innerHTML).toContain("Success Content");
        expect(container.querySelector(".ui-error-fallback")).toBeNull();
    });

    test("should catch error and render fallback UI", () => {
        const container = document.createElement("div");
        const boundary = new UIErrorBoundary(container, "TestComponent", () => {});
        const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

        boundary.run(() => {
            throw new Error("Render Failed Simulation");
        });

        expect(container.innerHTML).toContain("⚠️ TestComponent Error");
        expect(container.innerHTML).toContain("Render Failed Simulation");
        expect(container.querySelector(".ui-error-fallback")).not.toBeNull();
        
        consoleSpy.mockRestore();
    });

    test("should retry and recover successfully on next render run", () => {
        const container = document.createElement("div");
        let shouldFail = true;
        let retryCalled = false;
        
        const boundary = new UIErrorBoundary(container, "TestComponent", () => {
            retryCalled = true;
            shouldFail = false;
        });

        const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

        // First run - Fail
        boundary.run(() => {
            if (shouldFail) throw new Error("Crashed!");
            container.innerHTML = "<span>Recovered!</span>";
        });

        expect(container.querySelector(".ui-error-fallback")).not.toBeNull();

        // Click retry button
        const retryBtn = container.querySelector("button");
        expect(retryBtn).not.toBeNull();
        retryBtn?.click();

        expect(retryCalled).toBe(true);
        expect(container.querySelector(".ui-error-fallback")).toBeNull(); // Cleared error state

        // Second run - Succeed
        boundary.run(() => {
            if (shouldFail) throw new Error("Crashed!");
            container.innerHTML = "<span>Recovered!</span>";
        });

        expect(container.innerHTML).toContain("Recovered!");
        expect(container.querySelector(".ui-error-fallback")).toBeNull();

        consoleSpy.mockRestore();
    });
});
