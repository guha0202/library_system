import os
import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_system.settings')
django.setup()

from library.models import Book, Borrow

def fix_data():
    book_title = "Python Crash Course"
    
    try:
        book = Book.objects.get(title=book_title)
    except Book.DoesNotExist:
        print(f"错误：找不到书名为《{book_title}》的图书")
        return

    print(f"--- 开始处理《{book.title}》 ---")
    print(f"当前库存: {book.quantity}")

    # 查找该书所有未归还的借阅记录
    # 注意：这里会查找所有人的未归还记录，如果您只想处理特定用户，可以加 reader=user 参数
    borrows_to_delete = Borrow.objects.filter(book=book, return_date__isnull=True)
    count = borrows_to_delete.count()

    if count == 0:
        print("没有找到未归还的借阅记录，无需处理。")
        return

    print(f"发现 {count} 条未归还的借阅记录，准备清除...")

    # 1. 恢复库存
    book.quantity += count
    book.save()
    print(f"已恢复库存 +{count}。当前最新库存: {book.quantity}")

    # 2. 删除借阅记录
    borrows_to_delete.delete()
    print("已成功清除相关借阅记录。")
    print("--- 处理完成 ---")

if __name__ == '__main__':
    fix_data()
