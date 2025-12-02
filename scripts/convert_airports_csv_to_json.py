#!/usr/bin/env python3
"""
CSV 파일을 JSON으로 변환하는 스크립트

CSV 구조:
- 영문공항명 (English Airport Name)
- 한글공항명 (Korean Airport Name)
- IATA (IATA Code)
- 한글국가명 (Korean Country Name)

사용법:
1. CSV 파일을 프로젝트 루트에 'airports-korean.csv'로 저장
2. python scripts/convert_airports_csv_to_json.py 실행
3. client/src/data/airports-korean.json 파일이 생성됨
"""

import csv
import json
from pathlib import Path
from typing import Dict, List, Any

def parse_csv(csv_path: str) -> List[Dict[str, str]]:
    """CSV 파일을 파싱하여 리스트로 반환"""
    rows: List[Dict[str, str]] = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            iata = None
            for key in row.keys():
                if 'IATA' in key.upper() or key.upper() == 'IATA':
                    iata = row[key].strip().upper()
                    break
            
            if not iata or len(iata) != 3:
                continue  
            
            name_en = ''
            name_ko = ''
            country_ko = ''
            
            for key, value in row.items():
                value = value.strip() if value else ''
                
                if '영문' in key and '공항' in key:
                    name_en = value
                elif '한글' in key and '공항' in key:
                    name_ko = value
                elif '한글' in key and '국가' in key:
                    country_ko = value
            
            rows.append({
                'iata': iata,
                'name': name_en,
                'nameKorean': name_ko,
                'countryKorean': country_ko,
            })
    
    return rows

def convert_to_json(rows: List[Dict[str, str]]) -> Dict[str, Dict[str, Any]]:
    """리스트를 IATA 코드를 키로 하는 딕셔너리로 변환"""
    airports_map: Dict[str, Dict[str, Any]] = {}
    seen: set[str] = set()
    
    for row in rows:
        iata = row['iata']
        
        if iata in seen:
            continue
        seen.add(iata)
        
        search_keywords = [
            row['nameKorean'],
            row['name'],
            iata,
            row['countryKorean'],
        ]
        search_keyword = ' '.join(filter(None, search_keywords)).lower()
        
        airports_map[iata] = {
            'iata': iata,
            'name': row['name'],
            'nameKorean': row['nameKorean'],
            'countryKorean': row['countryKorean'],
            'searchKeyword': search_keyword,
        }
    
    return airports_map

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root / 'airports-korean.csv'
    output_dir = project_root / 'client' / 'src' / 'data'
    output_path = output_dir / 'airports-korean.json'
    
    if not csv_path.exists():
        print(f'❌ CSV 파일을 찾을 수 없습니다: {csv_path}')
        return
    
    rows = parse_csv(str(csv_path))
    
    airports_map = convert_to_json(rows)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(airports_map, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()

