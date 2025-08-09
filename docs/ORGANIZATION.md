# Project Organization Plan

## Current Issues
1. **Loose Files**: Multiple test scripts in root directory
2. **Documentation Scattered**: Various markdown files without hierarchy
3. **Component Duplication**: UI components in multiple locations
4. **Configuration Mixed**: Config files mixed with source code

## Proposed Structure

```
rag-specialist-bot/
├── docs/                           # All documentation
│   ├── README.md                   # Main project documentation
│   ├── CHANGELOG.md               # Version history and changes
│   ├── CLAUDE.md                  # Development guidelines
│   ├── SETUP.md                   # Setup and installation guide
│   ├── API.md                     # API documentation
│   ├── TESTING.md                 # Testing guide and strategies
│   └── ORGANIZATION.md            # This file
├── config/                        # All configuration files
│   ├── jest.config.js
│   ├── jest.setup.js
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── vercel.json
├── scripts/                       # Build and utility scripts
│   ├── test-runner.js
│   ├── test-models.js
│   ├── test-gemini.js
│   ├── test-model-service.js
│   └── test-env.js
├── public/                        # Static assets
│   └── (existing SVG files)
├── src/                           # Source code
│   ├── app/                       # Next.js app directory
│   ├── components/                # Shared UI components (consolidated)
│   ├── lib/                       # Core business logic
│   └── data/                      # Knowledge base content
├── package.json                   # Project metadata and dependencies
├── package-lock.json             # Dependency lock file
├── next-env.d.ts                 # Next.js type definitions
└── tsconfig.tsbuildinfo          # TypeScript build cache
```

## Benefits of New Structure

### 1. Clear Separation of Concerns
- **docs/**: All documentation in one place
- **config/**: All configuration files grouped
- **scripts/**: All utility scripts organized
- **src/**: Clean source code without clutter

### 2. Improved Developer Experience
- Easy to find documentation
- Configuration files logically grouped
- Test scripts organized and accessible
- Root directory clean and professional

### 3. Better Maintainability
- Documentation updates in dedicated folder
- Configuration changes isolated
- Script management simplified
- Source code structure preserved

### 4. Professional Appearance
- Clean root directory
- Logical file organization
- Industry-standard structure
- Easier onboarding for new developers

## Migration Plan

### Phase 1: Create New Directory Structure
1. Create `docs/`, `config/`, `scripts/` directories
2. Move documentation files to `docs/`
3. Move configuration files to `config/`
4. Move test scripts to `scripts/`

### Phase 2: Update References
1. Update import paths in configuration files
2. Update package.json script paths
3. Update documentation cross-references
4. Update .gitignore if necessary

### Phase 3: Consolidate Components
1. Review component usage between `src/app/components/` and `src/components/ui/`
2. Consolidate into single component structure
3. Update imports throughout codebase
4. Remove duplicate components

### Phase 4: Verification
1. Test all build processes
2. Verify all scripts work with new paths
3. Check documentation links
4. Ensure deployment configuration works

## File Movement Map

```bash
# Documentation
README.md -> docs/README.md
CHANGELOG.md -> docs/CHANGELOG.md
CLAUDE.md -> docs/CLAUDE.md  
SETUP.md -> docs/SETUP.md
125.md -> docs/API.md (rename and organize)

# Configuration
jest.config.js -> config/jest.config.js
jest.setup.js -> config/jest.setup.js
eslint.config.mjs -> config/eslint.config.mjs
postcss.config.mjs -> config/postcss.config.mjs
next.config.ts -> config/next.config.ts
vercel.json -> config/vercel.json

# Scripts
test-runner.js -> scripts/test-runner.js
test-models.js -> scripts/test-models.js
test-gemini.js -> scripts/test-gemini.js
test-model-service.js -> scripts/test-model-service.js
test-env.js -> scripts/test-env.js
```

## Configuration Updates Required

### package.json
- Update script paths to use `scripts/` directory
- Update Jest configuration path
- Update ESLint configuration path

### Jest Configuration
- Update test paths to account for new structure
- Update setup file path

### Next.js Configuration  
- Verify no hardcoded paths affected

### Vercel Configuration
- Update build command if necessary
- Verify deployment configuration

## Validation Steps

1. **Build Test**: `npm run build` succeeds
2. **Test Suite**: `npm test` runs correctly
3. **Development**: `npm run dev` starts properly
4. **Linting**: `npm run lint` uses correct config
5. **Deployment**: Vercel deployment works
6. **Documentation**: All links work correctly

## Timeline

- **Phase 1**: 30 minutes (directory creation and file moves)
- **Phase 2**: 45 minutes (configuration updates and testing)
- **Phase 3**: 60 minutes (component consolidation if needed)
- **Phase 4**: 30 minutes (verification and testing)

**Total Estimated Time**: 2.5 hours

## Risk Mitigation

1. **Backup**: Git commit before starting reorganization
2. **Incremental**: Move files in small batches and test
3. **Rollback Plan**: Keep original structure accessible via git
4. **Testing**: Comprehensive testing after each phase