import os
import django
import json
from datetime import datetime

# 1. 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_system.settings')
django.setup()

from library.models import Book, Author, Publisher, Category

def populate():
    print("正在从 books_data.json 加载数据...")
    
    # 获取 JSON 文件的绝对路径
    file_path = os.path.join(os.path.dirname(__file__), 'books_data.json')
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            books_data = json.load(f)
    except FileNotFoundError:
        print("错误: 找不到 books_data.json 文件")
        return

    for data in books_data:
        # --- 1. 处理出版社 ---
        publisher_name = data['publisher']
        publisher, created = Publisher.objects.get_or_create(name=publisher_name)
        if created:
            print(f"  [新增出版社] {publisher_name}")

        # --- 2. 创建或获取图书 ---
        book, created = Book.objects.get_or_create(
            isbn=data['isbn'],
            defaults={
                'title': data['title'],
                'publisher': publisher,
                'publication_date': data['pub_date'],
                'summary': data['summary'],
                'quantity': data['quantity']
            }
        )
        
        if created:
            print(f"  [新增图书] {book.title}")

            # --- 3. 处理作者 (多对多) ---
            for author_name in data['authors']:
                author, auth_created = Author.objects.get_or_create(name=author_name)
                if auth_created:
                    print(f"    [新增作者] {author_name}")
                book.authors.add(author)
            
            # --- 4. 处理分类 (多对多) ---
            for cat_name in data['categories']:
                category, cat_created = Category.objects.get_or_create(name=cat_name)
                if cat_created:
                    print(f"    [新增分类] {cat_name}")
                book.categories.add(category)
            
        else:
            print(f"  [已存在] {book.title}")

if __name__ == '__main__':
    print("开始执行数据填充脚本...")
    populate()
    print("数据填充完成！")
