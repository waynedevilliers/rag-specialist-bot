# Questions and Answers

## Q: Why did the chatbot break and start returning the same message for all queries?

**A:** The relevance filter was being too restrictive and filtering out legitimate fashion-related questions like "tell me about course 391" and "what courses do you offer?". The thresholds were set too high (0.7 for high relevance, 0.3 for low relevance) and the keyword lists didn't include course-related terms. 

Fixed by:
1. Adding course-related keywords like 'course', 'lesson', 'module', 'ellu', 'studios' to the CORE fashion keywords in `src/lib/relevance-filter.ts:18`
2. Adding course question patterns like `/what\s+(courses?|lessons?|modules?)/i` to FASHION_QUESTION_PATTERNS in `src/lib/relevance-filter.ts:144`
3. Lowering the relevance thresholds from 0.7/0.3 to 0.5/0.2 in `src/lib/relevance-filter.ts:153`

This ensures that course-related questions are properly recognized as fashion-relevant and processed by the RAG system instead of returning generic fallback responses.

---

## Q: What's the best approach for the relevance filter - complex filtering or letting RAG handle everything?

**A:** After analysis, **Option 4 (greetings only + strict RAG boundaries)** is the optimal solution for a specialized fashion design chatbot. The complex relevance filter was causing more problems than it solved.

**Why complex filtering failed:**
- High maintenance overhead with brittle keyword matching
- Frequent false negatives blocking legitimate questions like "what are line weights" 
- Complex logic with many edge cases
- Poor user experience when filtering failed

**Solution implemented:**
1. **Simplified relevance filter**: Only handles greetings for quick responses, lets RAG process everything else (`src/lib/relevance-filter.ts:187`)
2. **Strict RAG system boundaries**: Added explicit instructions to refuse non-fashion questions and redirect to fashion topics (`src/lib/rag-system.ts:641`)

**Benefits:**
- Eliminates false negatives completely
- Much simpler, maintainable codebase  
- Better user experience - legitimate questions always get processed
- RAG system enforces role boundaries more effectively than pre-filtering
- Cost increase is minimal and worth the reliability improvement

For specialized domain chatbots, it's better to let the LLM handle relevance filtering within its role constraints rather than trying to pre-filter with brittle keyword matching.

---