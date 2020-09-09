import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import Category from '../models/Category';

interface Request {
  cvsFileName: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ cvsFileName }: Request): Promise<Transaction[]> {
    const csvFilePath = path.join(uploadConfig.directory, cvsFileName);
    const readCSVStream = fs.createReadStream(csvFilePath);
    const categoryRepository = getRepository(Category);
    const transactionRepository = getRepository(Transaction);
    /**
     * from_line: 2 - Descarta a primeira linha do arquivo que, nesse caso, não são dados e sim o título para cada coluna.
     * ltrim: true e rtrim: true -> removem espacos em branco desnecessarios que ficam entre cada um dos valores.
     */
    const parseStream = csvParse({
      from_line: 2,
    });

    /**
     * O pipe é um método presente em toda stream que simplesmente transmite a informação de uma stream pra outra, ou seja,
     * estamos falando pra stream de leitura do arquivo CSV representada pela variável readCSVStream que sempre que ela
     * tiver uma informação disponível, deve envia-la para a nossa outra stream, a parseStream.
     */

    const parseCSV = readCSVStream.pipe(parseStream);

    // const lines = Array<Transaction>();

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    /**
     * Nessa linha agora estamos "ouvindo" as novas informações obtidas do arquivo CSV,
     * linha por linha e imprimindo-as em tela.
     */

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      categories.push(category);
      transactions.push({ title, type, value, category });
    });
    /**
     * Toda stream no Node dispara um evento chamado end assim que a comunicação é finalizada
     */
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    // Verifica se as categorias existem no banco de dados de uma vez
    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
