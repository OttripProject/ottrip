#!/usr/bin/env python3
"""
OCR + 항공권 파싱 전체 파이프라인 테스트
"""

import os
from typing import Union
from google.cloud import vision


def setup_credentials() -> bool:
    """Google Cloud 인증 설정"""
    credentials_path = ".key/ottrip-maps-527603ee108a.json"
    
    if os.path.exists(credentials_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        print(f"✅ 인증 파일 설정 완료: {credentials_path}")
        return True
    else:
        print(f"❌ 인증 파일을 찾을 수 없습니다: {credentials_path}")
        return False


def extract_text_from_image(image_path: str) -> Union[str, None]:
    """이미지에서 텍스트 추출"""
    try:
        client = vision.ImageAnnotatorClient()
        
        with open(image_path, 'rb') as image_file:
            content = image_file.read()

        image = vision.Image(content=content)
        response = client.text_detection(image=image)
        texts = response.text_annotations
        
        if response.error.message:
            raise Exception(f"API 오류: {response.error.message}")
        
        if not texts:
            print("❌ 이미지에서 텍스트를 찾을 수 없습니다.")
            return None
        
        return texts[0].description
        
    except Exception as e:
        print(f"❌ OCR 오류 발생: {str(e)}")
        return None


def main():
    """전체 파이프라인 테스트"""
    print("🚀 OCR + 항공권 파싱 전체 파이프라인 테스트")
    print("=" * 60)
    
    # 1. 인증 설정
    if not setup_credentials():
        return
    
    # 2. 이미지 파일 입력
    image_path = input("항공권 이미지 파일 경로를 입력하세요: ").strip()
    
    if not os.path.exists(image_path):
        print(f"❌ 파일을 찾을 수 없습니다: {image_path}")
        return
    
    print(f"\n🔍 파일 분석 시작: {image_path}")
    
    # 3. OCR 텍스트 추출
    print("\n📄 1단계: OCR 텍스트 추출 중...")
    ocr_text = extract_text_from_image(image_path)
    
    if not ocr_text:
        print("❌ OCR 텍스트 추출 실패")
        return
    
    print("✅ OCR 텍스트 추출 완료!")
    print(f"추출된 텍스트:\n{ocr_text}")
    print("-" * 50)
 


if __name__ == "__main__":
    main()
