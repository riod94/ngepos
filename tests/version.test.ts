import { describe, it, expect, beforeEach } from "vitest";
import {
  parseVersion,
  formatVersion,
  parseCommitMessage,
  determineVersionBump,
  bumpVersion,
  compareVersions,
  AutoVersioner,
  createVersionTag,
} from "~/lib/version";

describe("Version Management", () => {
  describe("parseVersion", () => {
    it("should parse standard version string", () => {
      const version = parseVersion("v1.2.3");
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
    });

    it("should parse version without v prefix", () => {
      const version = parseVersion("2.0.0");
      expect(version.major).toBe(2);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
    });

    it("should parse version with prerelease", () => {
      const version = parseVersion("v1.0.0-alpha.1");
      expect(version.major).toBe(1);
      expect(version.prerelease).toBe("alpha.1");
    });

    it("should handle invalid versions gracefully", () => {
      const version = parseVersion("invalid");
      expect(version.major).toBe(0);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
    });
  });

  describe("formatVersion", () => {
    it("should format version with v prefix", () => {
      const version = { major: 1, minor: 2, patch: 3 };
      expect(formatVersion(version)).toBe("v1.2.3");
    });

    it("should format version with prerelease", () => {
      const version = { major: 1, minor: 0, patch: 0, prerelease: "beta.1" };
      expect(formatVersion(version)).toBe("v1.0.0-beta.1");
    });
  });

  describe("parseCommitMessage", () => {
    it("should parse feat commit", () => {
      const commit = parseCommitMessage("feat: add new feature");
      expect(commit.type).toBe("feat");
      expect(commit.message).toBe("add new feature");
      expect(commit.isVersionable).toBe(true);
    });

    it("should parse fix commit", () => {
      const commit = parseCommitMessage("fix: fix bug");
      expect(commit.type).toBe("fix");
      expect(commit.isVersionable).toBe(true);
    });

    it("should parse commit with scope", () => {
      const commit = parseCommitMessage("feat(auth): add login");
      expect(commit.type).toBe("feat");
      expect(commit.scope).toBe("auth");
    });

    it("should detect breaking changes", () => {
      const commit = parseCommitMessage("feat!: breaking change");
      expect(commit.breaking).toBe(true);
      expect(commit.type).toBe("BREAKING_CHANGE");
    });

    it("should handle non-conventional commits", () => {
      const commit = parseCommitMessage("random message");
      expect(commit.type).toBe("chore");
      expect(commit.isVersionable).toBe(false);
    });
  });

  describe("determineVersionBump", () => {
    it("should return major for breaking changes", () => {
      const commits = ["feat!: breaking change", "fix: regular fix"];
      expect(determineVersionBump(commits)).toBe("major");
    });

    it("should return minor for features", () => {
      const commits = ["feat: new feature", "docs: update readme"];
      expect(determineVersionBump(commits)).toBe("minor");
    });

    it("should return patch for fixes", () => {
      const commits = ["fix: bug fix", "perf: improve performance"];
      expect(determineVersionBump(commits)).toBe("patch");
    });

    it("should return patch for chore commits", () => {
      const commits = ["chore: update deps"];
      expect(determineVersionBump(commits)).toBe("patch");
    });
  });

  describe("bumpVersion", () => {
    it("should bump major version", () => {
      const version = { major: 1, minor: 2, patch: 3 };
      const bumped = bumpVersion(version, "major");
      expect(bumped.major).toBe(2);
      expect(bumped.minor).toBe(0);
      expect(bumped.patch).toBe(0);
    });

    it("should bump minor version", () => {
      const version = { major: 1, minor: 2, patch: 3 };
      const bumped = bumpVersion(version, "minor");
      expect(bumped.minor).toBe(3);
      expect(bumped.patch).toBe(0);
    });

    it("should bump patch version", () => {
      const version = { major: 1, minor: 2, patch: 3 };
      const bumped = bumpVersion(version, "patch");
      expect(bumped.patch).toBe(4);
    });
  });

  describe("compareVersions", () => {
    it("should return 1 when v1 > v2", () => {
      expect(compareVersions("v2.0.0", "v1.0.0")).toBe(1);
    });

    it("should return -1 when v1 < v2", () => {
      expect(compareVersions("v1.0.0", "v2.0.0")).toBe(-1);
    });

    it("should return 0 when equal", () => {
      expect(compareVersions("v1.2.3", "v1.2.3")).toBe(0);
    });
  });

  describe("AutoVersioner", () => {
    it("should initialize with default version", () => {
      const versioner = new AutoVersioner();
      expect(versioner.getVersion()).toBe("v0.1.0");
    });

    it("should bump version correctly", () => {
      const versioner = new AutoVersioner({ major: 1, minor: 0, patch: 0 });
      const bump = versioner.bump("minor");
      expect(bump.type).toBe("minor");
      expect(bump.previousVersion).toBe("v1.0.0");
      expect(bump.newVersion).toBe("v1.1.0");
    });

    it("should determine bump type from commits", () => {
      const versioner = new AutoVersioner({ major: 1, minor: 0, patch: 0 });
      const bump = versioner.bumpFromCommits(["feat: new feature"]);
      expect(bump?.type).toBe("minor");
    });

    it("should create version tags", () => {
      const version = { major: 1, minor: 2, patch: 3 };
      expect(createVersionTag(version)).toBe("v1.2.3");
    });
  });
});
