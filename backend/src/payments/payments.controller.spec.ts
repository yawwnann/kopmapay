import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StorageService } from '../storage/storage.service';
import { BadRequestException } from '@nestjs/common';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;
  let storageService: StorageService;

  const mockPaymentsService = {
    create: jest.fn(),
  };

  const mockStorageService = {
    saveFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockRequest = {
      user: {
        sub: 'user-123',
        role: 'ANGGOTA',
        email: 'user@example.com',
        name: 'Test User',
      },
    } as any;

    const mockFile = {
      fieldname: 'proofImage',
      originalname: 'proof.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    };

    it('should pass paymentMethod to service when creating payment', async () => {
      const createPaymentDto = {
        nominal: 100000,
        description: 'Test payment',
        paymentMethod: 'Cash',
      };

      const mockUrl = '/uploads/proofs/test-uuid.webp';

      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        nominal: 100000,
        proofImage: mockUrl,
        description: 'Test payment',
        paymentMethod: 'Cash',
        status: 'PENDING',
        createdAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'user@example.com',
        },
      };

      mockStorageService.saveFile.mockResolvedValue(mockUrl);
      mockPaymentsService.create.mockResolvedValue(mockPayment);

      const result = await controller.create(
        mockRequest,
        createPaymentDto,
        mockFile,
      );

      expect(storageService.saveFile).toHaveBeenCalledWith(mockFile, 'proofs');
      expect(paymentsService.create).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          nominal: 100000,
          description: 'Test payment',
          paymentMethod: 'Cash',
        }),
        mockUrl,
      );
      expect(result).toEqual({
        message: 'Payment submitted successfully',
        payment: mockPayment,
      });
    });

    it('should pass paymentMethod for QRIS payments', async () => {
      const createPaymentDto = {
        nominal: 50000,
        paymentMethod: 'QRIS',
      };

      const mockUrl = '/uploads/proofs/test-uuid.webp';

      mockStorageService.saveFile.mockResolvedValue(mockUrl);
      mockPaymentsService.create.mockResolvedValue({
        id: 'payment-456',
        paymentMethod: 'QRIS',
      });

      await controller.create(mockRequest, createPaymentDto, mockFile);

      expect(paymentsService.create).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          paymentMethod: 'QRIS',
        }),
        mockUrl,
      );
    });

    it('should pass paymentMethod for Bank Transfer payments', async () => {
      const createPaymentDto = {
        nominal: 75000,
        paymentMethod: 'BankTransfer',
      };

      const mockUrl = '/uploads/proofs/test-uuid.webp';

      mockStorageService.saveFile.mockResolvedValue(mockUrl);
      mockPaymentsService.create.mockResolvedValue({
        id: 'payment-789',
        paymentMethod: 'BankTransfer',
      });

      await controller.create(mockRequest, createPaymentDto, mockFile);

      expect(paymentsService.create).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          paymentMethod: 'BankTransfer',
        }),
        mockUrl,
      );
    });

    it('should throw BadRequestException when file is missing', async () => {
      const createPaymentDto = {
        nominal: 100000,
        paymentMethod: 'Cash',
      };

      await expect(
        controller.create(mockRequest, createPaymentDto, undefined),
      ).rejects.toThrow(BadRequestException);

      expect(paymentsService.create).not.toHaveBeenCalled();
    });
  });
});
