# Hanafuda Documentation Map

Quick reference guide to all documentation files in this project.

## 📍 Where to Find Information

### Project Root Documentation

| File | Purpose | Best For |
|------|---------|----------|
| **Claude.md** | AI assistant context and architecture | Developers starting work, understanding patterns, adding features |
| **README.md** | Main project documentation | Users playing, developers understanding features, setup instructions |
| **QUICKSTART.md** | Technical quick-start and optimization | Asset optimization, technical setup details |
| **DOCUMENTATION_MAP.md** | This file - navigation guide | Finding what documentation exists |

### Active Development Docs
- **Location:** `claudedocs/`
- **Contains:** Current work-in-progress documentation
- **See:** `claudedocs/ACTIVE-DOCS-GUIDE.md` for navigation

### Historical/Archived Docs
- **Location:** `claudedocs/archived/`
- **Contains:** 24 files documenting completed features and phases
- **See:** `claudedocs/archived/README.md` for detailed index

---

## 🎯 By Use Case

### Setting Up the Project
1. Read: **README.md** → Getting Started section
2. Run: `npm install && npm run dev`
3. Optional: **QUICKSTART.md** for asset optimization

### Understanding the Codebase
1. Read: **Claude.md** → Codebase Architecture section
2. Read: **Claude.md** → Key Design Patterns section
3. Reference: **Claude.md** → Common Pitfalls section

### Adding a New Feature
1. Review: **Claude.md** → File Modification Patterns
2. Review: **Claude.md** → Development Conventions
3. Check: **claudedocs/archived/** for similar completed features
4. Code → Test → Reference Claude.md as needed

### Understanding Game Rules
1. Read: **README.md** → How to Play section
2. Reference: **README.md** → Game Options section
3. Deep dive: **README.md** → Yaku (Scoring Combinations) section

### Working with 3D Animations
1. Read: **Claude.md** → Animation System Details section
2. Reference: **Claude.md** → Key Design Patterns → 3D Animation System

### Testing Changes
1. Check: **Claude.md** → Testing & Verification section
2. Review: **claudedocs/archived/TESTING-GUIDE.md** (for reference)
3. Manual testing based on feature type

### Understanding Sakura Mode
1. Reference: **README.md** → Features section (mentions Sakura)
2. Historical details: **claudedocs/archived/SAKURA_IMPLEMENTATION_PLAN.md**

### Understanding Game Architecture
1. Core game logic: `/src/game/` directory
2. Pattern reference: **Claude.md** → Game State Flow
3. Phase reference: **Claude.md** → Game Phases

---

## 📚 Documentation Quality Standards

### What Makes Documentation Useful
✅ Clear, specific purpose stated upfront
✅ Current and reflects actual codebase state
✅ Code examples when appropriate
✅ Links to related documentation
✅ Organized with clear hierarchy

### Keeping Documentation Fresh
- Update when code changes significantly
- Archive when feature is complete
- Remove stale references
- Link between related documents

---

## 🔄 Documentation Workflow

### When Starting Work
1. Check **Claude.md** for architecture context
2. Check project root README for feature details
3. Reference **ACTIVE-DOCS-GUIDE.md** for active work

### When Completing a Feature
1. Update **README.md** if user-facing
2. Update **Claude.md** if architectural
3. Consider archiving session docs

### When Something is Wrong
1. Check Claude.md for common pitfalls
2. Search archived docs for similar issues
3. Create new session doc if new investigation needed

---

## 📋 Directory Structure at a Glance

```
hanafuda/
├── DOCUMENTATION_MAP.md          ← You are here
├── Claude.md                     ← Architecture & patterns [READ FIRST]
├── README.md                     ← Features & user guide [MAIN REFERENCE]
├── QUICKSTART.md                 ← Technical setup
├── src/                          ← Source code
├── assets/                       ← Game assets
├── claudedocs/
│   ├── ACTIVE-DOCS-GUIDE.md      ← How to navigate active docs
│   ├── [session files]           ← Current work documentation
│   └── archived/
│       ├── README.md             ← Archived docs index
│       └── [24 archived files]   ← Historical documentation
└── [other project files]
```

---

## 🎓 Learning Path

### For New Developers
1. **Claude.md** - Overview of architecture and conventions
2. **README.md** - Features and how the game works
3. Pick a small task and reference **Claude.md** as you code
4. When complete, check **claudedocs/archived/** for similar examples

### For Game Rule Questions
1. **README.md** - Koi-Koi Scoring Rules section
2. **Claude.md** - Game Domain Context section
3. Relevant archived docs in `claudedocs/archived/`

### For Animation/Rendering Work
1. **Claude.md** - Animation System Details section
2. Relevant archived implementation docs
3. Code review in `/src/` directories

---

## 🏃 Quick Commands

```bash
# View main documentation
less Claude.md          # Architecture and patterns
less README.md          # Features and user guide
less QUICKSTART.md      # Technical setup

# Navigate documentation
cd claudedocs/          # Active session documentation
cd claudedocs/archived/ # Historical documentation

# Find archived documentation
ls claudedocs/archived/ # List all archived files
```

---

## ✅ Documentation Checklist

Use this to maintain documentation health:

- [ ] Claude.md reflects current architecture
- [ ] README.md has all user-visible features documented
- [ ] Code changes have related documentation updates
- [ ] Archived docs index (archived/README.md) is current
- [ ] No dead links in active documentation
- [ ] ACTIVE-DOCS-GUIDE.md is relevant and current

---

**Last Updated:** November 16, 2024
**Status:** Documentation structure optimized and organized
