// import AppError from '../errors/AppError';
import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionsRepository);

    // Busca a categoria pelo nome.
    let checkCategoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    // Verificar se a categoria existe, caso nao exista cria uma nova.
    if (!checkCategoryExists) {
      checkCategoryExists = categoryRepository.create({
        title: category,
      });

      checkCategoryExists = await categoryRepository.save(checkCategoryExists);
    }

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('You dont have enough balance.');
    }

    // Salva a transacao com a categoria.
    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: checkCategoryExists.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
