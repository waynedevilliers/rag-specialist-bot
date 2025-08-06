# Security Review Requests Queue

## Current Requests

### 🔴 HIGH PRIORITY - Security Fixes for Phase 2-3 Optimizations
**Created**: 2025-08-05  
**Requestor**: Lead Agent  
**Status**: IN_PROGRESS  

**Files to Review/Fix**:
- `src/lib/hnsw-index.ts` - Memory exhaustion, algorithmic attacks
- `src/lib/vector-store.ts` - API key exposure, cache poisoning  
- `src/lib/rag-system.ts` - Prompt injection, cache poisoning
- `src/lib/vector-quantizer.ts` - Mathematical precision issues
- `src/lib/knowledge-base.ts` - Path traversal, regex DoS

**Critical Issues Identified**:
1. **API Key Exposure** - OpenAI key not properly validated/secured
2. **Cache Poisoning** - Predictable cache keys allow poisoning attacks
3. **Prompt Injection** - User queries directly embedded in prompts
4. **Memory Exhaustion** - No bounds checking on vector operations
5. **Input Validation** - Missing validation across all vector operations

**Expected Completion**: 2025-08-05 (Before deployment)

---

## Completed Reviews

*None yet*

---

## Review Templates

### New Code Review Request
```markdown
### 🟡 [PRIORITY] - [Brief Description]
**Created**: [Date]
**Requestor**: [Agent Name]
**Status**: PENDING

**Files to Review**:
- [file1] - [brief description]
- [file2] - [brief description]

**Security Concerns**:
- [concern 1]
- [concern 2]

**Context**:
[Additional context about the changes]

**Expected Completion**: [Date]
```

### Security Incident Report
```markdown
### 🔴 SECURITY INCIDENT - [Brief Description]
**Detected**: [Date/Time]
**Severity**: HIGH/MEDIUM/LOW
**Status**: [OPEN/INVESTIGATING/RESOLVED]

**Description**:
[What happened]

**Impact**:
[Potential or actual impact]

**Immediate Actions Taken**:
- [action 1]
- [action 2]

**Root Cause**:
[If known]

**Resolution**:
[Steps taken to resolve]
```

---

## How to Request Security Review

1. **For Code Changes**: Add entry above with files and concerns
2. **For Security Questions**: Use Task tool with "security-review" description  
3. **For Incidents**: Use incident template above
4. **For General Guidance**: Reference `.claude/security-checklist.md`

## Security Agent Coordination

The security review process follows this workflow:

1. **Request Created** → Added to this queue
2. **Lead Agent** → Assigns to appropriate agent/tool
3. **Security Review** → Conducted using Task tool or dedicated agent
4. **Report Generated** → Findings documented in `.claude/security-reports/`
5. **Fixes Implemented** → Critical issues addressed immediately
6. **Review Complete** → Request moved to completed section

---

Last Updated: 2025-08-05