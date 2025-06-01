import csv
import json
from datetime import datetime

def convert_csv_to_json(input_file, output_file, flight_type):
    """
    將 CSV 文件轉換為 JSON 格式
    
    Args:
        input_file: 輸入的 CSV 文件名
        output_file: 輸出的 JSON 文件名 
        flight_type: 航班類型 ("arrival" 或 "departure")
    """
    flights_data = []
    
    with open(input_file, 'r', encoding='utf-8') as csv_file:
        csv_reader = csv.reader(csv_file)
        
        # 跳過標題行
        next(csv_reader, None)
        
        for row in csv_reader:
            if len(row) >= 4:  # 確保每行有足夠的欄位
                # 處理實際時間欄位，如果為空則設為 null
                actual_time = row[4] if len(row) > 4 and row[4].strip() else None
                
                flight_info = {
                    "scheduled_time": row[0],
                    "location": row[1],
                    "airline": row[2],
                    "status": row[3],
                    "actual_time": actual_time
                }
                flights_data.append(flight_info)
    
    # 將數據寫入 JSON 文件
    with open(output_file, 'w', encoding='utf-8') as json_file:
        json.dump(flights_data, json_file, ensure_ascii=False, indent=2)
    
    print(f"成功轉換 {len(flights_data)} 條{flight_type}航班記錄到 {output_file}")
    return len(flights_data)

def main():
    """主函數：處理所有 CSV 文件"""
    print("開始轉換 CSV 文件到 JSON 格式...")
    
    # 轉換到達航班數據
    arrival_count = convert_csv_to_json('arrival.csv', 'arrival.json', '到達')
    
    # 轉換出發航班數據  
    departure_count = convert_csv_to_json('departure.csv', 'departure.json', '出發')
    
    print(f"\n轉換完成！")
    print(f"- 到達航班：{arrival_count} 條記錄 → arrival.json")
    print(f"- 出發航班：{departure_count} 條記錄 → departure.json")
    print(f"- 總計：{arrival_count + departure_count} 條記錄")

if __name__ == "__main__":
    main() 