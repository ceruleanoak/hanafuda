# Active Documentation Guide

This guide helps you navigate the current, active documentation for the Hanafuda Koi-Koi project.

## Documentation Locations

### Project Root Level
Located at `/Users/thomaslarson/gamedev/hanafuda/`

- **Claude.md** - AI Assistant Context
  - Architecture overview and design patterns
  - Development conventions and common pitfalls
  - Game domain terminology (yaku, koi-koi, etc.)
  - Animation system details
  - **When to use:** Before making code changes or architectural decisions

- **README.md** - User & Developer Documentation
  - Feature overview and game mechanics
  - Installation and setup instructions
  - How to play instructions
  - Card structure and yaku scoring reference
  - Project structure and organization
  - **When to use:** For understanding features, setup, or project layout

- **QUICKSTART.md** - Technical Setup
  - Quick reference for PNG optimization
  - File size analysis and palettization
  - **When to use:** For technical setup or asset optimization questions

### Claude Docs Directory
Located at `/Users/thomaslarson/gamedev/hanafuda/claudedocs/`

This directory is now streamlined to contain only active, current documentation:
- **Newly added**: Individual game mode or feature documentation (as needed)
- **Session notes**: Current work-in-progress documentation
- **Active investigation**: Any ongoing debugging or research

### Archived Documentation
Located at `/Users/thomaslarson/gamedev/hanafuda/claudedocs/archived/`

Contains 25+ historical documents covering:
- Sakura implementation journey
- Phase-based development milestones
- Session summaries and checkpoints
- Testing procedures and validation results
- Implementation details and fixes

**See `archived/README.md` for detailed index**

---

## Quick Reference by Use Case

### "I need to understand the codebase architecture"
→ **Claude.md** - Core Systems & Design Patterns sections

### "I need to add a new feature"
→ **Claude.md** - File Modification Patterns section

### "I need to understand game rules"
→ **README.md** - Game Options & Yaku sections
→ **Claude.md** - Game Domain Context section

### "I need to understand the 3D animation system"
→ **Claude.md** - Animation System Details section

### "I need to test a feature"
→ **archived/TESTING-GUIDE.md** (for reference)
→ Manual testing based on feature type

### "I need to understand how a feature was implemented"
→ **archived/** - Look for phase or session docs related to that feature

### "I need quick setup instructions"
→ **README.md** - Getting Started section

### "I need to set up the development environment"
→ **README.md** - Prerequisites and Installation sections

---

## Documentation Philosophy

### What Goes in Active Docs
- Architecture and design decisions (Claude.md)
- Current features and how to use them (README.md)
- Development conventions and patterns (Claude.md)
- Setup and deployment instructions (README.md)

### What Gets Archived
- Session work summaries (historical snapshots)
- Completed phase documentation (milestone markers)
- Implementation details of finished features
- Testing checklists for completed work
- Pre-push checklists and readiness documents

### Why This Matters
By keeping active docs focused and relevant:
- Easier to find current information
- Less confusion about which doc is authoritative
- Historical context preserved but organized
- Cleaner working directory

---

## Updating Documentation

### Adding New Documentation
1. If it's about **architecture/patterns**: Update Claude.md
2. If it's about **features/gameplay**: Update README.md
3. If it's **technical setup**: Update QUICKSTART.md or add to Claude.md
4. If it's **session work**: Add to claudedocs/ directory as a named session file

### Archiving Documentation
When a feature or phase is complete:
1. Move doc to `claudedocs/archived/`
2. Update `archived/README.md` index
3. Remove stale references from active docs

### Updating Existing Docs
- **Claude.md**: Update when architecture changes, add new patterns, fix pitfalls
- **README.md**: Update when features change, rules clarified, new game modes added
- **QUICKSTART.md**: Update for new tools or optimization techniques

---

## Directory Structure

```
hanafuda/
├── Claude.md                    ← Architecture & patterns
├── README.md                    ← Features & user guide
├── QUICKSTART.md               ← Technical setup
├── claudedocs/
│   ├── ACTIVE-DOCS-GUIDE.md   ← You are here
│   ├── [active session files]  ← Current work docs
│   └── archived/
│       ├── README.md           ← Archive index
│       ├── SAKURA_*.md         ← Historical Sakura docs
│       ├── PHASE-*.md          ← Historical phase docs
│       ├── SESSION-*.md        ← Historical session docs
│       └── [22 more files...]  ← Other historical docs
├── src/
├── assets/
└── [other project files]
```

---

## Document Health Checklist

Regular maintenance keeps docs useful:

- [ ] Claude.md reflects current architecture
- [ ] README.md matches current features and game rules
- [ ] No dead links or outdated references in active docs
- [ ] Archived docs index is current
- [ ] Completed features have been documented or archived
- [ ] No duplicate documentation files

---

**Last Updated:** November 16, 2024
**Status:** Active project documentation structure established
