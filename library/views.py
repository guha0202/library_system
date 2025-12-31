from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.contrib.auth.models import User
from .models import Book, Author, Publisher, Category, Borrow
from .serializers import BookSerializer, AuthorSerializer, PublisherSerializer, CategorySerializer, UserSerializer, BorrowSerializer
from .permissions import IsAdminOrReadOnly

# Create your views here.

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    获取或更新当前登录用户的信息
    GET /api/me/
    PUT/PATCH /api/me/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('-publication_date')
    serializer_class = BookSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'authors__name', 'isbn', 'publisher__name', 'categories__name']
    
    # 权限控制
    def get_permissions(self):
        # 1. 允许任何人浏览 (GET)
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # 2. 只有管理员可以管理图书 (POST, PUT, DELETE)
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        # 3. 其他操作（如借书、还书）需要登录用户
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def borrow(self, request, pk=None):
        """
        借书接口：POST /api/books/{id}/borrow/
        """
        book = self.get_object()
        user = request.user # 使用当前登录用户
        
        # 借阅限制配置
        MAX_BORROW_LIMIT = 5

        # 0. 检查是否有逾期未还书籍
        overdue_books = Borrow.objects.filter(
            reader=user, 
            return_date__isnull=True, 
            due_date__lt=timezone.now().date()
        )
        if overdue_books.exists():
            return Response(
                {'status': 'error', 'message': '您有逾期未还的书籍，请先归还后再借阅'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. 检查借阅数量限制
        current_borrow_count = Borrow.objects.filter(reader=user, return_date__isnull=True).count()
        if current_borrow_count >= MAX_BORROW_LIMIT:
            return Response(
                {'status': 'error', 'message': f'您已达到最大借阅数量限制 ({MAX_BORROW_LIMIT}本)，请先归还部分书籍'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. 检查是否已借阅该书
        if Borrow.objects.filter(reader=user, book=book, return_date__isnull=True).exists():
            return Response(
                {'status': 'error', 'message': '您已借阅该书，尚未归还'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if book.quantity > 0:
            # 3. 扣减库存
            book.quantity -= 1
            book.save()
            
            # 4. 创建借阅记录
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
        borrows = Borrow.objects.filter(reader=user, return_date__isnull=True).order_by('due_date')
        # 序列化借阅记录，而不是书籍
        serializer = BorrowSerializer(borrows, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def borrow_history(self, request):
        """
        获取当前用户的借阅历史（已归还的书籍）
        GET /api/books/borrow_history/
        """
        user = request.user
        # 找到该用户已归还的借阅记录，按归还日期倒序排列
        history = Borrow.objects.filter(reader=user, return_date__isnull=False).order_by('-return_date')
        
        # 使用分页
        page = self.paginate_queryset(history)
        if page is not None:
            serializer = BorrowSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = BorrowSerializer(history, many=True, context={'request': request})
        return Response(serializer.data)

class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all().order_by('name')
    serializer_class = AuthorSerializer
    permission_classes = [IsAdminOrReadOnly]

class PublisherViewSet(viewsets.ModelViewSet):
    queryset = Publisher.objects.all().order_by('name')
    serializer_class = PublisherSerializer
    permission_classes = [IsAdminOrReadOnly]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
