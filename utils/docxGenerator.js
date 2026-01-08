const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

/**
 * Create a simple DOCX document from HTML content
 * This creates a basic DOCX structure programmatically
 */
async function createDocxFromHtml(htmlContent, resumeData) {
  // Create a minimal DOCX structure
  // DOCX files are ZIP archives containing XML files
  const zip = new PizZip();
  
  // Create the main document XML
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>${escapeXml(resumeData.name)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(resumeData.email)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(resumeData.phone)}</w:t>
      </w:r>
    </w:p>
    <w:p/>
    ${generateExperienceSection(resumeData.experience)}
    ${generateEducationSection(resumeData.education)}
    ${generateSkillsSection(resumeData.skills)}
  </w:body>
</w:document>`;

  // Create [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  // Create _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Create word/_rels/document.xml.rels
  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // Create word/styles.xml (minimal styles)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;

  // Add files to ZIP
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/_rels/document.xml.rels', wordRelsXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', stylesXml);

  // Generate the DOCX buffer
  return zip.generate({ type: 'nodebuffer' });
}

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateExperienceSection(experience) {
  if (!experience || experience.length === 0) return '';
  
  let xml = `<w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Professional Experience</w:t>
      </w:r>
    </w:p>`;
  
  experience.forEach(exp => {
    xml += `<w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>${escapeXml(exp.position || '')}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(exp.company || '')}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(exp.startDate || '')} - ${escapeXml(exp.endDate || 'Present')}</w:t>
      </w:r>
    </w:p>`;
    
    if (exp.description) {
      xml += `<w:p>
        <w:r>
          <w:t>${escapeXml(exp.description)}</w:t>
        </w:r>
      </w:p>`;
    }
    
    xml += `<w:p/>`;
  });
  
  return xml;
}

function generateEducationSection(education) {
  if (!education || education.length === 0) return '';
  
  let xml = `<w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Education</w:t>
      </w:r>
    </w:p>`;
  
  education.forEach(edu => {
    xml += `<w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>${escapeXml(edu.degree || '')}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(edu.institution || '')}</w:t>
      </w:r>
    </w:p>`;
    
    if (edu.field) {
      xml += `<w:p>
        <w:r>
          <w:t>Field: ${escapeXml(edu.field)}</w:t>
        </w:r>
      </w:p>`;
    }
    
    xml += `<w:p>
      <w:r>
        <w:t>${escapeXml(edu.startDate || '')} - ${escapeXml(edu.endDate || 'Present')}</w:t>
      </w:r>
    </w:p>
    <w:p/>`;
  });
  
  return xml;
}

function generateSkillsSection(skills) {
  if (!skills || skills.length === 0) return '';
  
  let xml = `<w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Skills</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${escapeXml(skills.join(', '))}</w:t>
      </w:r>
    </w:p>`;
  
  return xml;
}

module.exports = {
  createDocxFromHtml
};

