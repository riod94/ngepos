export type VersionType = "major" | "minor" | "patch";

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  buildMetadata?: string;
}

export interface VersionBump {
  type: VersionType;
  previousVersion: string;
  newVersion: string;
  timestamp: number;
  commitHash?: string;
}

export interface CommitMessage {
  type: "feat" | "fix" | "docs" | "style" | "refactor" | "perf" | "test" | "build" | "ci" | "chore" | "revert" | "BREAKING_CHANGE";
  scope?: string;
  message: string;
  breaking?: boolean;
  isVersionable: boolean;
}

const VERSION_STORAGE_KEY = "ngepos_version";

export function parseVersion(versionString: string): Version {
  const fullVersion = versionString.startsWith("v") ? versionString.slice(1) : versionString;

  const [base, prerelease, buildMetadata] = fullVersion.split(/[-+]/);
  const [major, minor, patch] = base.split(".").map(Number);

  return {
    major: isNaN(major) ? 0 : major,
    minor: isNaN(minor) ? 0 : minor,
    patch: isNaN(patch) ? 0 : patch,
    prerelease,
    buildMetadata,
  };
}

export function formatVersion(version: Version): string {
  let result = `v${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) result += `-${version.prerelease}`;
  if (version.buildMetadata) result += `+${version.buildMetadata}`;
  return result;
}

export function parseCommitMessage(message: string): CommitMessage {
  const trimmed = message.trim();

  const conventionalCommitRegex = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
  const match = trimmed.match(conventionalCommitRegex);

  if (!match) {
    return {
      type: "chore",
      message: trimmed,
      isVersionable: false,
    };
  }

  const [, type, scope, breakingFlag, ...messageParts] = match;
  const fullMessage = messageParts.join(":").trim();
  const isBreaking = breakingFlag === "!" || trimmed.includes("BREAKING CHANGE");

  const featTypes = ["feat"];
  const fixTypes = ["fix", "perf", "refactor"];
  const docsTypes = ["docs"];
  const testTypes = ["test"];
  const buildTypes = ["build", "ci"];
  const otherTypes = ["style", "chore", "revert"];

  let isVersionable = true;
  if (![...featTypes, ...fixTypes, ...docsTypes, ...testTypes, ...buildTypes, ...otherTypes].includes(type)) {
    isVersionable = false;
  }

  if (isBreaking) {
    return {
      type: "BREAKING_CHANGE",
      scope,
      message: fullMessage,
      breaking: true,
      isVersionable: true,
    };
  }

  return {
    type: type as CommitMessage["type"],
    scope,
    message: fullMessage,
    isVersionable,
  };
}

export function determineVersionBump(commits: string[]): VersionType {
  let hasBreaking = false;
  let hasFeature = false;
  let hasFix = false;
  let hasPerf = false;

  for (const msg of commits) {
    const parsed = parseCommitMessage(msg);

    if (parsed.breaking) hasBreaking = true;
    if (parsed.type === "feat") hasFeature = true;
    if (parsed.type === "fix") hasFix = true;
    if (parsed.type === "perf") hasPerf = true;
  }

  if (hasBreaking) return "major";
  if (hasFeature) return "minor";
  if (hasFix || hasPerf) return "patch";

  return "patch";
}

export function bumpVersion(version: Version, type: VersionType): Version {
  const newVersion = { ...version };

  switch (type) {
    case "major":
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case "minor":
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case "patch":
      newVersion.patch += 1;
      break;
  }

  return newVersion;
}

export function getStoredVersion(): Version {
  if (typeof localStorage === "undefined") {
    return { major: 0, minor: 1, patch: 0 };
  }

  const stored = localStorage.getItem(VERSION_STORAGE_KEY);
  if (!stored) {
    return { major: 0, minor: 1, patch: 0 };
  }

  try {
    return parseVersion(stored);
  } catch {
    return { major: 0, minor: 1, patch: 0 };
  }
}

export function setStoredVersion(version: Version): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(VERSION_STORAGE_KEY, formatVersion(version));
}

export function getVersionHistory(): VersionBump[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const stored = localStorage.getItem(`${VERSION_STORAGE_KEY}_history`);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addVersionBump(bump: VersionBump): void {
  if (typeof localStorage === "undefined") return;

  const history = getVersionHistory();
  history.unshift(bump);

  const limited = history.slice(0, 50);
  localStorage.setItem(`${VERSION_STORAGE_KEY}_history`, JSON.stringify(limited));
}

export class AutoVersioner {
  private currentVersion: Version;
  private bumpHistory: VersionBump[] = [];

  constructor(initialVersion?: Version) {
    this.currentVersion = initialVersion || getStoredVersion();
    this.bumpHistory = getVersionHistory();
  }

  getVersion(): string {
    return formatVersion(this.currentVersion);
  }

  getVersionObject(): Version {
    return { ...this.currentVersion };
  }

  getBumpHistory(): VersionBump[] {
    return [...this.bumpHistory];
  }

  bump(type: VersionType, commitHash?: string): VersionBump {
    const previousVersion = this.getVersion();
    this.currentVersion = bumpVersion(this.currentVersion, type);
    const newVersion = this.getVersion();

    const bumpRecord: VersionBump = {
      type,
      previousVersion,
      newVersion,
      timestamp: Date.now(),
      commitHash,
    };

    this.bumpHistory.unshift(bumpRecord);
    addVersionBump(bumpRecord);
    setStoredVersion(this.currentVersion);

    return bumpRecord;
  }

  bumpFromCommits(commits: string[], commitHash?: string): VersionBump | null {
    const bumpType = determineVersionBump(commits);

    if (bumpType === "patch") {
      const lastBump = this.bumpHistory[0];
      if (lastBump) {
        const hoursSinceLastBump = (Date.now() - lastBump.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastBump < 24 && lastBump.type === "patch") {
          return null;
        }
      }
    }

    return this.bump(bumpType, commitHash);
  }

  resetTo(major: number, minor: number, patch: number): Version {
    this.currentVersion = { major, minor, patch };
    setStoredVersion(this.currentVersion);
    return this.getVersionObject();
  }
}

export const autoVersioner = new AutoVersioner();

export function createVersionTag(version: Version, prefix = "v"): string {
  let tag = `${prefix}${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) tag += `-${version.prerelease}`;
  return tag;
}

export function compareVersions(v1: string, v2: string): -1 | 0 | 1 {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }

  if (parsed1.prerelease && !parsed2.prerelease) return -1;
  if (!parsed1.prerelease && parsed2.prerelease) return 1;

  if (parsed1.prerelease && parsed2.prerelease) {
    return parsed1.prerelease > parsed2.prerelease ? 1 : -1;
  }

  return 0;
}
