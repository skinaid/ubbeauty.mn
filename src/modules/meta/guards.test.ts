import { describe, expect, it } from "vitest";
import { OrgNotFoundError } from "./guards";

describe("OrgNotFoundError", () => {
  it("is an instance of Error", () => {
    const err = new OrgNotFoundError();
    expect(err).toBeInstanceOf(Error);
  });

  it("is identifiable via instanceof", () => {
    const err = new OrgNotFoundError();
    expect(err instanceof OrgNotFoundError).toBe(true);
  });

  it("has the correct code", () => {
    const err = new OrgNotFoundError();
    expect(err.code).toBe("ORG_NOT_FOUND");
  });

  it("has the correct name", () => {
    const err = new OrgNotFoundError();
    expect(err.name).toBe("OrgNotFoundError");
  });

  it("has a message", () => {
    const err = new OrgNotFoundError();
    expect(err.message).toBe("Organization not found");
  });

  it("can be distinguished from generic errors in a catch block", () => {
    try {
      throw new OrgNotFoundError();
    } catch (e) {
      if (e instanceof OrgNotFoundError) {
        expect(e.code).toBe("ORG_NOT_FOUND");
      } else {
        throw new Error("Should have matched OrgNotFoundError");
      }
    }
  });
});
