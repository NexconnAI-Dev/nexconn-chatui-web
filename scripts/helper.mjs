import {
  rmdirSync, existsSync, statSync, rmSync, mkdirSync, unlinkSync, copyFileSync,
  readdirSync,
} from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/** Remove a directory. */
export function rmdir(target) {
  // Added in Node 14.14; rmdirSync is deprecated in later versions.
  const handler = typeof rmSync === 'function' ? rmSync : rmdirSync;
  if (existsSync(target) && statSync(target).isDirectory()) handler(target, { recursive: true });
}

/** Create a directory. */
export function mkdir(target) {
  mkdirSync(target, { recursive: true });
}

/** Remove a file. */
export function rmFile(target) {
  if (existsSync(target) && !statSync(target).isDirectory()) unlinkSync(target);
}

/** Copy a file to the target path. */
export function copyFile(src, desk) {
  mkdir(join(desk, '..'));
  copyFileSync(src, desk);
}

/** Copy a directory or file to the target path. */
export function copy(src, desk) {
  if (statSync(src).isDirectory()) {
    readdirSync(src).forEach((item) => copy(join(src, item), join(desk, item)));
    return;
  }
  copyFile(src, desk);
}

/** Execute a shell command. */
export function exec(command, cwd = process.cwd()) {
  execSync(command, { stdio: 'inherit', cwd });
}

/**
 * Recursively remove files matching a pattern under a directory.
 * @param path Directory containing the files to remove.
 * @param regexp Regular expression used to match files.
 * @param skips Absolute file paths to skip.
 * @returns
 */
export function rmF(path, regexp, skips = []) {
  if (statSync(path).isDirectory()) {
    readdirSync(path).forEach((item) => rmF(join(path, item), regexp, skips));
    // Remove empty directories.
    if (readdirSync(path).length === 0) rmdir(path);
    return;
  }

  if (skips.some((item) => item === path)) {
    return;
  }

  if (regexp.test(path)) {
    unlinkSync(path);
  }
}

export const log = (content) => {
  process.stdout.write(`${content}\n`);
};

export const error = (content) => {
  process.stderr.write(`${content}\n`);
};
