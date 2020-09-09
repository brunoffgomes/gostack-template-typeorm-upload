import { Router } from 'express';

import { getCustomRepository } from 'typeorm';
import multer from 'multer';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';
import uploadConfig from '../config/upload';

const upload = multer(uploadConfig);

const transactionsRouter = Router();

/**
 * Essa rota deve retornar uma listagem com todas as transações que você cadastrou até agora,
 * junto com o valor da soma de entradas, retiradas e total de crédito. Essa rota deve retornar um objeto o seguinte formato:
 */

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const transactions = await transactionsRepository.getTransactions();
  const balance = await transactionsRepository.getBalance();

  return response.json({ transactions, balance });
});
/**
 * A rota deve receber title, value, type, e category dentro do corpo da requisição, sendo o type o tipo da transação,
 * que deve ser income para entradas (depósitos) e outcome para saídas (retiradas). Ao cadastrar uma nova transação,
 *  ela deve ser armazenada dentro do seu banco de dados, possuindo os campos id, title, value, type, category_id, created_at, updated_at.
 */

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const createTransaction = new CreateTransactionService();

  const transaction = await createTransaction.execute({
    title,
    value,
    type,
    category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  const deleteTransaction = new DeleteTransactionService();

  await deleteTransaction.execute({
    id,
  });

  return response.json();
});

/**
 *  A rota deve permitir a importação de um arquivo com formato .csv contendo
 * as mesmas informações necessárias para criação de uma transação
 * id, title, value, type, category_id, created_at, updated_at, onde
 * cada linha do arquivo CSV deve ser um novo registro para o banco de dados,
 * e por fim retorne todas as transactions que foram importadas para seu banco de dados.
 * O arquivo csv, deve seguir o seguinte modelo
 */

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const importTransaction = new ImportTransactionsService();

    const transactions = await importTransaction.execute({
      cvsFileName: request.file.filename,
    });

    return response.json(transactions);
  },
);

export default transactionsRouter;
