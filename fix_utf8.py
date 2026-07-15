#!/usr/bin/env python3
"""Fix corrupted UTF-8 (mojibake) in the stats components."""

import re

def fix_mojibake(text):
    """Fix UTF-8 bytes that were misinterpreted as Latin-1/Windows-1252."""
    # The pattern: bytes that are valid UTF-8 for Cyrillic but got double-encoded
    # We need to take the Latin-1 chars and re-encode as UTF-8

    def decode_match(match):
        try:
            # Take the matched string, encode as latin-1 to get original bytes, then decode as utf-8
            return match.group(0).encode('latin-1').decode('utf-8')
        except:
            return match.group(0)

    # Match sequences of Latin-1 chars that look like double-encoded UTF-8
    # Pattern: Ã followed by another char, or Ã/Ã followed by another char
    pattern = r'(?:[ÃÃ][\x80-\xBF]|[ÃÃ][\x80-\xBF]){2,}'
    return re.sub(pattern, decode_match, text)

# Fix MonthlyStatsCard.tsx
with open('/Users/AlexT/Projects/Ministry/src/components/stats/MonthlyStatsCard.tsx', 'r') as f:
    content = f.read()

fixed = fix_mojibake(content)

with open('/Users/AlexT/Projects/Ministry/src/components/stats/MonthlyStatsCard.tsx', 'w') as f:
    f.write(fixed)

print("Fixed MonthlyStatsCard.tsx")

# Fix ServiceYearStatsCard.tsx
with open('/Users/AlexT/Projects/Ministry/src/components/stats/ServiceYearStatsCard.tsx', 'r') as f:
    content = f.read()

fixed = fix_mojibake(content)

with open('/Users/AlexT/Projects/Ministry/src/components/stats/ServiceYearStatsCard.tsx', 'w') as f:
    f.write(fixed)

print("Fixed ServiceYearStatsCard.tsx")