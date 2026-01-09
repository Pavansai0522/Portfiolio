# Templates Directory

This directory contains base template files for document generation.

## Structure

```
templates/
  ├── resumgo/       # ResumGO resume templates
  ├── dochipo/       # DocHipo document templates
  └── writecream/    # WriteCream content templates
```

## Adding Templates

1. Place your template files (PDF or DOCX) in the appropriate provider directory
2. Name them descriptively (e.g., `default.pdf`, `modern-resume.pdf`)
3. Upload the templates to your chosen API service (APITemplate.io or CraftMyPDF)
4. Update the template service with the template IDs from the API service

## Template Format

Templates should include placeholder fields that will be replaced with portfolio data:
- Personal information fields
- Experience sections
- Education sections
- Skills lists
- Projects sections
- Achievements sections

Refer to `TEMPLATE_SETUP.md` in the root directory for detailed setup instructions.



