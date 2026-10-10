---
layout: single
title: "Curriculum vitae"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
# Upload your CV to files/cv.pdf, or change the path below to match its filename.
cv_pdf: /files/cv.pdf
---

<p>
  <a href="{{ page.cv_pdf | relative_url }}">Open CV PDF</a>
  &middot;
  <a href="{{ page.cv_pdf | relative_url }}" download>Download CV</a>
</p>

<iframe
  src="{{ page.cv_pdf | relative_url }}"
  title="Griffin Edwards's curriculum vitae"
  width="100%"
  height="800"
  style="display: block; width: 100%; height: 80vh; min-height: 500px; border: 0;">
</iframe>
