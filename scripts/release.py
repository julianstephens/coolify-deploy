#!/usr/bin/env python3
import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def parse_changelog(changelog_path):
    """
    Parses the CHANGELOG.md file to extract the latest version and its notes.
    Assumes the format:
    ## vX.Y.Z

    - Notes...
    """
    if not changelog_path.exists():
        print(f"Error: {changelog_path} not found.")
        sys.exit(1)

    content = changelog_path.read_text(encoding='utf-8')

    # Find the first version header
    # Matches "## v1.2.3" or "## [v1.2.3]"
    version_pattern = re.compile(r'^##\s+\[?(v\d+\.\d+\.\d+)\]?.*$', re.MULTILINE)
    match = version_pattern.search(content)

    if not match:
        print("Error: Could not find a version header in CHANGELOG.md")
        sys.exit(1)

    version = match.group(1)
    start_index = match.end()

    # Find the next version header to determine the end of the notes
    next_match = version_pattern.search(content, start_index)

    if next_match:
        notes = content[start_index:next_match.start()].strip()
    else:
        notes = content[start_index:].strip()

    return version, notes

def run_command(cmd, dry_run=False, input_text=None):
    """Runs a shell command or prints it if dry_run is True."""
    if dry_run:
        print(f"[DRY RUN] Would run: {' '.join(cmd)}")
        return True

    print(f"Running: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True, text=True, input=input_text)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        return False

def replace_except_first(s, old, new):
    i = s.find(old) + len(old)
    newStr = s[0:i]
    newStr += s[i:].replace(old, new)
    return newStr

def main():
    parser = argparse.ArgumentParser(description="Release script based on CHANGELOG.md")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without executing them")
    parser.add_argument("--no-push", action="store_true", help="Skip pushing the git tag. Automatically implies --no-release")
    parser.add_argument("--no-release", action="store_true", help="Skip creating a GitHub release")

    args = parser.parse_args()

    root_dir = Path(__file__).parent.parent
    changelog_path = root_dir / "CHANGELOG.md"

    print(f"Reading {changelog_path}...")
    version, notes = parse_changelog(changelog_path)

    print(f"Latest version: {version}")
    print("-" * 20)
    print(notes)
    print("-" * 20)

    notes_path = ""
    with tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".md", encoding="utf-8") as f:
      notes_path = f.name
      f.write(notes)

    print(f"Release notes written to temporary file: {notes_path}")

    # 1. Create annotated git tag
    tag_cmd = ["git", "tag", "-a", version, "-F", notes_path]
    if not run_command(tag_cmd, args.dry_run):
        sys.exit(1)

    os.remove(notes_path)
    print(f"Temporary file {notes_path} removed.")

    if args.no_push:
        print("Skipping git tag push and GitHub release creation (--no-push specified).")
        sys.exit(0)

    # 2. Push the tag
    push_cmd = ["git", "push", "origin", version]
    if not run_command(push_cmd, args.dry_run):
        sys.exit(1)

    # 3. Create GitHub release
    if not args.no_release:
        gh_cmd = ["gh", "release", "create", version, "-t", version, "--notes-from-tag"]
        if not run_command(gh_cmd, args.dry_run):
            sys.exit(1)
    else:
        print("Skipping GitHub release creation (--no-release specified).")

if __name__ == "__main__":
    main()
