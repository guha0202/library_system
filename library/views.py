from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from .models import Book, Author, Publisher, Category, Borrow
from .serializers import BookSerializer, AuthorSerializer, PublisherSerializer, CategorySerializer, UserSerializer

# Create your views here.

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('-publication_date')
    serializer_class = BookSerializer
    
    # 默认需要登录才能操作，但查看列表(list)和详情(retrieve)可以公开
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def borrow(self, request, pk=None):
        """
        借书接口：POST /api/books/{id}/borrow/
        """
        book = self.get_object()
        user = request.user # 使用当前登录用户

        # 1. 检查是否已借阅
        if Borrow.objects.filter(reader=user, book=book, return_date__isnull=True).exists():
            return Response(
                {'status': 'error', 'message': '您已借阅该书，尚未归还'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if book.quantity > 0:
            # 2. 扣减库存
            book.quantity -= 1
            book.save()
            
            # 3. 创建借阅记录
            Borrow.objects.create(reader=user, book=book)
            
            return Response({
                'status': 'success', 
                'message': f'成功借阅《{book.title}》',
                'quantity': book.quantity,
                'user_status': 'BORROWED'
            })
        else:
            return Response(
                {'status': 'error', 'message': '库存不足，无法借阅'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """
        归还图书接口：POST /api/books/{id}/return_book/
        """
        book = self.get_object()
        user = request.user # 使用当前登录用户

        # 查找未归还的借阅记录
        borrow_record = Borrow.objects.filter(
            reader=user, 
            book=book, 
            return_date__isnull=True
        ).first()

        if not borrow_record:
            return Response(
                {'status': 'error', 'message': '您没有正在借阅该书'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 执行归还逻辑
        borrow_record.return_date = timezone.now().date()
        borrow_record.status = 'RETURNED'
        borrow_record.save()

        # 恢复库存
        book.quantity += 1
        book.save()

        return Response({
            'status': 'success', 
            'message': f'成功归还《{book.title}》',
            'quantity': book.quantity,
            'user_status': 'AVAILABLE'
        })

    @action(detail=False, methods=['get'])
    def my_borrowed_books(self, request):
        """
        获取当前用户正在借阅的书籍
        GET /api/books/my_borrowed_books/
        """
        user = request.user
        # 找到该用户未归还的借阅记录
        borrows = Borrow.objects.filter(reader=user, return_date__isnull=True)
        # 获取对应的书籍ID列表
        book_ids = borrows.values_list('book_id', flat=True)
        # 获取书籍对象
        books = Book.objects.filter(id__in=book_ids)
        # 序列化
        serializer = self.get_serializer(books, many=True)
        return Response(serializer.data)

class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all().order_by('name')
    serializer_class = AuthorSerializer

class PublisherViewSet(viewsets.ModelViewSet):
    queryset = Publisher.objects.all().order_by('name')
    serializer_class = PublisherSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
