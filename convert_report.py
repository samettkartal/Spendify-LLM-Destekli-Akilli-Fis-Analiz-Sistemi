
import markdown
import os

# Paths
md_file_path = r"C:\Users\samet\.gemini\antigravity\brain\da1b8bb3-016e-4e50-866f-086837e79399\final_project_report.md"
html_output_path = r"C:\Users\samet\Desktop\YAZILIM\llmprojesifinalplus\Spendify_Final_Report.html"

# Read Markdown
with open(md_file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Convert to HTML
html_content = markdown.markdown(text, extensions=['tables', 'fenced_code'])

# Add CSS for A4 PDF styling
styled_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Spendify Final Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
        }}
        img {{
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 10px 0;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }}
        h1, h2, h3 {{ color: #2c3e50; }}
        h1 {{ border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        h2 {{ border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }}
        code {{ background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: Consolas, monospace; }}
        pre {{ background: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #ddd; }}
        blockquote {{ border-left: 4px solid #3498db; margin: 0; padding-left: 15px; color: #555; background: #f9f9f9; padding: 10px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        
        @media print {{
            body {{ width: 210mm; height: 297mm; margin: 0; padding: 20mm; }}
            pre, blockquote {{ page-break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
"""

# Write to file
with open(html_output_path, "w", encoding="utf-8") as f:
    f.write(styled_html)

print(f"BİLGİ: Rapor HTML olarak oluşturuldu: {html_output_path}")
