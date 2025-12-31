import os
import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_system.settings')
django.setup()

from library.models import Book

def set_stock_zero():
    book_title = "Python Crash Course"
    
    try:
        book = Book.objects.get(title=book_title)
        print(f"正在处理: 《{book.title}》")
        print(f"当前库存: {book.quantity}")
        
        book.quantity = 0
        book.save()
        
        print(f"修改成功！当前库存已变为: {book.quantity}")
        
    except Book.DoesNotExist:
        print(f"错误：找不到书名为《{book_title}》的图书")

if __name__ == '__main__':
    set_stock_zero()
