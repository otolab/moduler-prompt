---
"@moduler-prompt/driver": patch
---

GoogleGenAI driver improvements: Element to Parts/Content mapping and model update

- Implement proper Element to Parts/Content conversion for Gemini API
- Map instructions to systemInstruction (Part[]) and data to contents (Content[])
- Add role conversion: assistant→model, system→user
- Add integration tests for Element conversion
- Update default model from gemini-2.0-flash-exp to gemma-3-27b for better stability
