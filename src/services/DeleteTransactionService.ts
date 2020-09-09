import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const transaction = await transactionRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new Error();
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
