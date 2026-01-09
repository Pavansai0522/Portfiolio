# Resume Generator - Full Stack Application

A complete resume generator built with Angular (frontend) and Node.js/Express (backend) that allows users to create professional resumes with live preview and export to PDF or DOCX formats.

## Features

- ✅ **Resume Form** with two-way data binding using `ngModel`
- ✅ **Live Preview** - See your resume in real-time as you type
- ✅ **Multiple Templates** - Classic and Modern resume templates
- ✅ **Template Switching** - Switch between templates dynamically
- ✅ **PDF Export** - Generate ATS-friendly A4 PDF using Puppeteer
- ✅ **DOCX Export** - Generate Word documents using docxtemplater
- ✅ **Clean & Modular Code** - Production-ready architecture
- ✅ **Free & Open Source** - No paid APIs or external services

## Tech Stack

### Frontend
- Angular 17
- TypeScript
- Tailwind CSS (via existing setup)
- RxJS

### Backend
- Node.js
- Express
- Puppeteer (PDF generation)
- docxtemplater + pizzip (DOCX generation)
- Handlebars (template rendering)

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- `puppeteer` - For PDF generation
- `docxtemplater` - For DOCX generation
- `pizzip` - For DOCX file manipulation
- `handlebars` - For template rendering

### 2. Backend Setup

The backend server runs on `http://localhost:3001` by default.

**Note:** Puppeteer will download Chromium automatically on first run. This may take a few minutes.

### 3. Frontend Setup

The Angular frontend runs on `http://localhost:4200` by default.

## Running Locally

### Option 1: Run Both Frontend and Backend Together

```bash
npm run start:dev
```

This command uses `concurrently` to run both the backend server and Angular dev server simultaneously.

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
npm run start:backend
```

**Terminal 2 - Frontend:**
```bash
npm start
```

## Usage

1. Navigate to `http://localhost:4200/resume-generator` in your browser
2. Fill in your resume information:
   - Personal details (name, email, phone)
   - Skills (add multiple skills)
   - Experience (add multiple work experiences)
   - Education (add multiple education entries)
3. Select a template (Classic or Modern)
4. Choose export format (PDF or DOCX)
5. View the live preview on the right side
6. Click "Generate Resume" to download your resume

## API Endpoints

### POST /api/resume
Generate a resume as PDF or DOCX.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1 (555) 123-4567",
  "skills": ["JavaScript", "TypeScript", "Angular"],
  "experience": [
    {
      "position": "Software Engineer",
      "company": "Tech Corp",
      "description": "Developed web applications...",
      "startDate": "Jan 2020",
      "endDate": "Dec 2022",
      "isCurrent": false
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "institution": "University Name",
      "field": "Computer Science",
      "startDate": "2016",
      "endDate": "2020",
      "isCurrent": false
    }
  ],
  "templateId": "classic",
  "format": "pdf"
}
```

**Response:**
- PDF: Binary PDF file
- DOCX: Binary DOCX file

### GET /api/resume/templates
Get available resume templates.

**Response:**
```json
{
  "success": true,
  "templates": [
    { "id": "classic", "name": "Classic" },
    { "id": "modern", "name": "Modern" }
  ]
}
```

## Project Structure

```
.
├── api/
│   └── resume.js              # Vercel serverless function
├── templates/
│   ├── classic.html            # Classic resume template
│   └── modern.html             # Modern resume template
├── utils/
│   ├── resumeTemplates.js      # Template rendering utility
│   └── docxGenerator.js        # DOCX generation utility
├── src/
│   └── app/
│       ├── components/
│       │   └── resume-generator/
│       │       ├── resume-generator.component.ts
│       │       ├── resume-generator.component.html
│       │       └── resume-generator.component.scss
│       └── services/
│           └── resume-generator.service.ts
└── server.js                   # Express server (contains /api/resume endpoint)
```

## Template System

Templates are HTML files using Handlebars syntax located in the `templates/` directory. To add a new template:

1. Create a new HTML file in `templates/` (e.g., `minimal.html`)
2. Use Handlebars syntax for data binding:
   - `{{name}}` - Simple variable
   - `{{#if condition}}...{{/if}}` - Conditional blocks
   - `{{#each items}}...{{/each}}` - Loops
3. The template will automatically be available in the UI

## PDF Generation

PDFs are generated using Puppeteer, which:
- Renders the HTML template with data
- Converts to A4 format PDF
- Includes proper margins for printing
- Generates ATS-friendly output

## DOCX Generation

DOCX files are generated programmatically using:
- `docxtemplater` for template processing
- `pizzip` for ZIP file manipulation (DOCX is a ZIP archive)
- Custom XML structure for Word document format

## Troubleshooting

### Puppeteer Installation Issues

If Puppeteer fails to download Chromium:
```bash
# On Linux/Mac
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
npm install puppeteer

# Or set environment variable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false npm install
```

### Port Already in Use

If port 3001 or 4200 is already in use:
- Backend: Set `PORT` environment variable
- Frontend: Use `ng serve --port 4201`

### PDF Generation Fails

- Ensure Puppeteer is properly installed
- Check that Chromium downloaded successfully
- Verify sufficient disk space for temporary files

## Production Deployment

### Vercel Deployment

The project includes Vercel serverless function support:
- `api/resume.js` handles the `/api/resume` endpoint
- Templates are included in the deployment
- Puppeteer works in Vercel's serverless environment

### Environment Variables

No special environment variables required for basic functionality.

## License

This project uses only free and open-source libraries. No paid APIs or external services are required.

## Contributing

Feel free to submit issues and enhancement requests!



