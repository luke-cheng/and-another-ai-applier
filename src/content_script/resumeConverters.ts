// Resume Format Converters
// Converts ResumeData to DOCX format
// Assumes all file inputs for resume/CV accept DOCX

import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { ResumeData } from "../schemas/resumeSchema";

export type FileFormat = "docx";

// Detect preferred file format from accept attribute - always returns docx
export function detectFileFormatFromAccept(acceptAttribute: string | null | undefined): FileFormat {
    // Always return docx for resume/CV inputs
    return "docx";
}

// Format resume data to match the sample format exactly
function formatResumeText(resumeData: ResumeData): string {
    const lines: string[] = [];

    // Name
    const firstName = resumeData.personalInfo?.firstName || "";
    const lastName = resumeData.personalInfo?.lastName || "";
    if (firstName || lastName) {
        lines.push(`${firstName} ${lastName}`.trim());
    }
    lines.push("");

    // Contact info: phone | email | linkedin | github | website
    const contactParts: string[] = [];
    if (resumeData.personalInfo?.phone) {
        contactParts.push(resumeData.personalInfo.phone);
    }
    if (resumeData.personalInfo?.email) {
        contactParts.push(resumeData.personalInfo.email);
    }
    if (resumeData.personalInfo?.urls?.website || resumeData.personalInfo?.urls?.github) {
        const website = resumeData.personalInfo.urls.website || resumeData.personalInfo.urls.github || resumeData.personalInfo.urls.linkedin;
        if (website) {
            // Remove http:// or https:// prefix if present
            const cleanWebsite = website.replace(/^https?:\/\//, "");
            contactParts.push(cleanWebsite);
        }
    }
    if (contactParts.length > 0) {
        lines.push(contactParts.join(" | "));
    }
    lines.push("");
    lines.push("");

    // EDUCATION
    if (resumeData.education && resumeData.education.length > 0) {
        lines.push(""); // Empty line before section header
        lines.push("EDUCATION");
        lines.push("");

        resumeData.education.forEach((edu) => {
            const eduParts: string[] = [];

            // Format: "MS in Computer & Information Science | University of Pittsburgh | GPA 3.8 	Aug 2022 - May 2024"
            if (edu.degree && edu.major) {
                eduParts.push(`${edu.degree} in ${edu.major}`);
            }

            if (edu.schoolName) {
                eduParts.push(edu.schoolName);
            }

            // Check for GPA in bulletsPoints
            if (edu.bulletsPoints && edu.bulletsPoints.length > 0) {
                const gpaMatch = edu.bulletsPoints.join(" ").match(/GPA\s*[\d.]+/i);
                if (gpaMatch) {
                    eduParts.push(gpaMatch[0]);
                }
            }

            // Date range - use tab for alignment
            // Dates are expected in "MMM YYYY" format (e.g., "Aug 2022") or "Present" for endDate
            const dateRange = (edu.startDate || edu.endDate)
                ? `${edu.startDate || ""} - ${edu.endDate || "Present"}`.trim()
                : "";

            if (dateRange && dateRange !== "-") {
                // Add tab before date for alignment (matching sample format)
                lines.push(`${eduParts.join(" | ")}  ${dateRange}`);
            } else {
                lines.push(eduParts.join(" | "));
            }

            lines.push("");
        });
    }

    // EXPERIENCE
    if (resumeData.experience && resumeData.experience.length > 0) {
        lines.push(""); // Empty line before section header
        lines.push("EXPERIENCE");
        lines.push("");

        resumeData.experience.forEach((exp) => {
            // Format: "Lead Developer & Co-Founder | MOYU LLC, Pittsburgh, PA"
            const expParts: string[] = [];
            if (exp.jobTitle) {
                expParts.push(exp.jobTitle);
            }
            if (exp.companyName) {
                const location = exp.location ? `, ${exp.location}` : "";
                expParts.push(`${exp.companyName}${location}`);
            }

            if (expParts.length > 0) {
                lines.push(expParts.join(" | "));
            }

            // Date range on next line
            // Dates are expected in "MMM YYYY" format (e.g., "Aug 2022") or "Present" for endDate
            if (exp.startDate || exp.endDate) {
                const dateRange = `${exp.startDate || ""} - ${exp.endDate || "Present"}`.trim();
                if (dateRange && dateRange !== "-") {
                    lines.push("");
                    lines.push(dateRange);
                }
            }

            // Bullet points
            if (exp.bulletsPoints && exp.bulletsPoints.length > 0) {
                lines.push("");
                exp.bulletsPoints.forEach((bullet) => {
                    lines.push(`-  ${bullet}`);
                });
            }

            lines.push("");
        });
    }

    // PROJECTS
    if (resumeData.projects && resumeData.projects.length > 0) {
        lines.push(""); // Empty line before section header
        lines.push("PROJECTS");
        lines.push("");

        resumeData.projects.forEach((proj) => {
            // Project name on first line
            if (proj.name) {
                lines.push(proj.name);
            }

            // Bullet points
            if (proj.bulletsPoints && proj.bulletsPoints.length > 0) {
                lines.push("");
                proj.bulletsPoints.forEach((bullet) => {
                    lines.push(`•  ${bullet}`);
                });
            }

            lines.push("");
        });
    }

    // SKILLS
    if (resumeData.skills && resumeData.skills.length > 0) {
        lines.push(""); // Empty line before section header
        lines.push("SKILLS");
        lines.push("");
        lines.push(resumeData.skills.join(", "));
        lines.push("");
    }

    return lines.join("\n");
}

// Convert ResumeData to TXT format (for backward compatibility)
export function convertResumeToText(resumeData: ResumeData): string {
    return formatResumeText(resumeData);
}

// Convert ResumeData to DOCX format - builds directly from JSON
export async function convertResumeToDocx(resumeData: ResumeData): Promise<Blob> {
    const paragraphs: Paragraph[] = [];

    // Font configuration
    const defaultFont = "Calibri";
    const defaultFontSize = 11; // Font size in points (will be converted to half-points: 11pt = 22)
    const paragraphSpacing = { before: 0, after: 0 };

    // Helper to create a paragraph
    const createParagraph = (text: string, options?: { bold?: boolean; center?: boolean }) => {
        return new Paragraph({
            children: [
                new TextRun({
                    text,
                    font: defaultFont,
                    size: defaultFontSize * 2,
                    bold: options?.bold || false,
                }),
            ],
            alignment: options?.center ? AlignmentType.CENTER : undefined,
            spacing: paragraphSpacing,
        });
    };

    // Helper to create a paragraph with multiple text runs (for mixed formatting)
    const createParagraphWithRuns = (runs: TextRun[], center?: boolean) => {
        return new Paragraph({
            children: runs,
            alignment: center ? AlignmentType.CENTER : undefined,
            spacing: paragraphSpacing,
        });
    };

    // Name - centered
    const firstName = resumeData.personalInfo?.firstName || "";
    const lastName = resumeData.personalInfo?.lastName || "";
    if (firstName || lastName) {
        paragraphs.push(createParagraph(`${firstName} ${lastName}`.trim(), { center: true }));
        paragraphs.push(createParagraph(""));
    }

    // Contact info - centered, pipe-separated
    const contactParts: string[] = [];
    if (resumeData.personalInfo?.phone) {
        contactParts.push(resumeData.personalInfo.phone);
    }
    if (resumeData.personalInfo?.email) {
        contactParts.push(resumeData.personalInfo.email);
    }
    if (resumeData.personalInfo?.urls?.website || resumeData.personalInfo?.urls?.github || resumeData.personalInfo?.urls?.linkedin) {
        const website = resumeData.personalInfo.urls.website || resumeData.personalInfo.urls.github || resumeData.personalInfo.urls.linkedin;
        if (website) {
            const cleanWebsite = website.replace(/^https?:\/\//, "");
            contactParts.push(cleanWebsite);
        }
    }
    if (contactParts.length > 0) {
        paragraphs.push(createParagraph(contactParts.join(" | "), { center: true }));
        paragraphs.push(createParagraph(""));
        paragraphs.push(createParagraph(""));
    }

    // EDUCATION
    if (resumeData.education && resumeData.education.length > 0) {
        paragraphs.push(createParagraph(""));
        paragraphs.push(createParagraph("EDUCATION", { bold: true }));
        paragraphs.push(createParagraph(""));

        resumeData.education.forEach((edu) => {
            const eduParts: string[] = [];

            // Format degree and major
            if (edu.degree && edu.major) {
                eduParts.push(`${edu.degree} in ${edu.major}`);
            }

            if (edu.schoolName) {
                eduParts.push(edu.schoolName);
            }

            // Check for GPA in bulletsPoints
            if (edu.bulletsPoints && edu.bulletsPoints.length > 0) {
                const gpaMatch = edu.bulletsPoints.join(" ").match(/GPA\s*[\d.]+/i);
                if (gpaMatch) {
                    eduParts.push(gpaMatch[0]);
                }
            }

            // Date range
            const dateRange = (edu.startDate || edu.endDate)
                ? `${edu.startDate || ""} - ${edu.endDate || "Present"}`.trim()
                : "";

            if (dateRange && dateRange !== "-") {
                paragraphs.push(createParagraph(`${eduParts.join(" | ")}  ${dateRange}`));
            } else {
                paragraphs.push(createParagraph(eduParts.join(" | ")));
            }
            paragraphs.push(createParagraph(""));
        });
    }

    // EXPERIENCE
    if (resumeData.experience && resumeData.experience.length > 0) {
        paragraphs.push(createParagraph(""));
        paragraphs.push(createParagraph("EXPERIENCE", { bold: true }));
        paragraphs.push(createParagraph(""));

        resumeData.experience.forEach((exp) => {
            // Job title | Company, Location - bold job title
            const expParts: string[] = [];
            if (exp.jobTitle) {
                expParts.push(exp.jobTitle);
            }
            if (exp.companyName) {
                const location = exp.location ? `, ${exp.location}` : "";
                expParts.push(`${exp.companyName}${location}`);
            }

            if (expParts.length > 0) {
                const parts = expParts.join(" | ").split(" | ");
                const jobTitle = parts[0];
                const rest = parts.slice(1).join(" | ");

                paragraphs.push(createParagraphWithRuns([
                    new TextRun({
                        text: jobTitle,
                        font: defaultFont,
                        size: defaultFontSize * 2,
                        bold: true,
                    }),
                    new TextRun({
                        text: rest ? ` | ${rest}` : "",
                        font: defaultFont,
                        size: defaultFontSize * 2,
                        bold: true, // Company line also bold
                    }),
                ]));
            }

            // Date range on next line
            if (exp.startDate || exp.endDate) {
                const dateRange = `${exp.startDate || ""} - ${exp.endDate || "Present"}`.trim();
                if (dateRange && dateRange !== "-") {
                    paragraphs.push(createParagraph(""));
                    paragraphs.push(createParagraph(dateRange));
                }
            }

            // Bullet points - use manually formatted bullets
            if (exp.bulletsPoints && exp.bulletsPoints.length > 0) {
                paragraphs.push(createParagraph(""));
                exp.bulletsPoints.forEach((bullet) => {
                    paragraphs.push(new Paragraph({
                        children: [
                            new TextRun({
                                text: `-  ${bullet}`,
                                font: defaultFont,
                                size: defaultFontSize * 2,
                            }),
                        ],
                        indent: { left: 360 },
                        spacing: paragraphSpacing,
                    }));
                });
            }

            paragraphs.push(createParagraph(""));
        });
    }

    // PROJECTS
    if (resumeData.projects && resumeData.projects.length > 0) {
        paragraphs.push(createParagraph(""));
        paragraphs.push(createParagraph("PROJECTS", { bold: true }));
        paragraphs.push(createParagraph(""));

        resumeData.projects.forEach((proj) => {
            // Project name - bold
            if (proj.name) {
                paragraphs.push(createParagraph(proj.name, { bold: true }));
            }

            // Bullet points - use manually formatted bullets
            if (proj.bulletsPoints && proj.bulletsPoints.length > 0) {
                paragraphs.push(createParagraph(""));
                proj.bulletsPoints.forEach((bullet) => {
                    paragraphs.push(new Paragraph({
                        children: [
                            new TextRun({
                                text: `-  ${bullet}`,
                                font: defaultFont,
                                size: defaultFontSize * 2,
                            }),
                        ],
                        indent: { left: 360 },
                        spacing: paragraphSpacing,
                    }));
                });
            }

            paragraphs.push(createParagraph(""));
        });
    }

    // SKILLS
    if (resumeData.skills && resumeData.skills.length > 0) {
        paragraphs.push(createParagraph(""));
        paragraphs.push(createParagraph("SKILLS", { bold: true }));
        paragraphs.push(createParagraph(""));
        paragraphs.push(createParagraph(resumeData.skills.join(", ")));
        paragraphs.push(createParagraph(""));
    }

    const doc = new Document({
        sections: [{
            children: paragraphs,
        }],
    });

    const blob = await Packer.toBlob(doc);
    return blob;
}

// Main converter function - always returns DOCX
export async function convertResumeToFormat(
    resumeData: ResumeData,
    format: FileFormat = "docx"
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
    const docxBlob = await convertResumeToDocx(resumeData);
    return {
        blob: docxBlob,
        filename: "resume.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
}

