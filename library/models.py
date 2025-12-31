from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

# Create your models here.

class Publisher(models.Model):
    """出版社模型"""
    name = models.CharField(max_length=100, unique=True, verbose_name="出版社名称")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "出版社"
        verbose_name_plural = verbose_name

class Author(models.Model):
    """作者模型"""
    name = models.CharField(max_length=100, unique=True, verbose_name="作者姓名")
    bio = models.TextField(blank=True, null=True, verbose_name="作者简介")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "作者"
        verbose_name_plural = verbose_name

class Category(models.Model):
    """图书分类模型"""
    name = models.CharField(max_length=50, unique=True, verbose_name="分类名称")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "图书分类"
        verbose_name_plural = verbose_name

class Book(models.Model):
    """图书模型"""
    title = models.CharField(max_length=200, verbose_name="书名")
    isbn = models.CharField(max_length=13, unique=True, verbose_name="ISBN")
    publisher = models.ForeignKey(Publisher, on_delete=models.CASCADE, verbose_name="出版社")
    authors = models.ManyToManyField(Author, verbose_name="作者")
    categories = models.ManyToManyField(Category, verbose_name="分类")
    publication_date = models.DateField(verbose_name="出版日期")
    summary = models.TextField(verbose_name="简介")
    quantity = models.PositiveIntegerField(default=1, verbose_name="库存数量")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "图书"
        verbose_name_plural = verbose_name

def default_due_date():
    return timezone.now() + timedelta(days=30)

class Reader(models.Model):
    """读者模型，扩展内置User模型"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="用户")
    phone_number = models.CharField(max_length=15, blank=True, verbose_name="电话号码")

    def __str__(self):
        return self.user.username

    class Meta:
        verbose_name = "读者"
        verbose_name_plural = verbose_name

class Borrow(models.Model):
    """借阅记录模型"""
    reader = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="读者")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, verbose_name="图书")
    borrow_date = models.DateField(auto_now_add=True, verbose_name="借阅日期")
    due_date = models.DateField(default=default_due_date, verbose_name="应还日期")
    return_date = models.DateField(null=True, blank=True, verbose_name="实际归还日期")

    BORROW_STATUS = [
        ('ON_LOAN', '借出中'),
        ('RETURNED', '已归还'),
        ('OVERDUE', '逾期'),
    ]
    status = models.CharField(
        max_length=10,
        choices=BORROW_STATUS,
        default='ON_LOAN',
        verbose_name="借阅状态"
    )

    def __str__(self):
        return f"{self.reader.username} 借阅 {self.book.title}"

    class Meta:
        verbose_name = "借阅记录"
        verbose_name_plural = verbose_name
