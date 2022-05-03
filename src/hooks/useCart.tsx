import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const addProduct = async (productId: number) => {
		try {
			const item = cart.find((product) => product.id === productId);

			if (item) {
				const resStock = await api.get<Stock>(`stock/${productId}`);
				const stock = resStock.data;
				const newAmount = item.amount + 1;

				if (newAmount > stock.amount) {
					toast.error('Quantidade solicitada fora de estoque');
					return;
				}
				const newCart = cart.map((product) =>
					product.id === productId
						? {
								...product,
								amount: newAmount,
						  }
						: product
				);

				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			} else {
				const resProduct = await api.get<Product>(`products/${productId}`);

				const newItem = { ...resProduct.data, amount: 1 };
				const newCart = [...cart, newItem];
				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			}
		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const item = cart.find((product) => productId === product.id);

			if (!item) throw new Error('');
			
			const newCart = cart.filter((product) => product.id !== productId);

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
		try {
			const resStock = await api.get<Stock>(`stock/${productId}`);
			const stock = resStock.data;

			if (amount < 1 || amount > stock.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			const item = cart.find((product) => product.id === productId);

			if (!item) throw new Error('');

			const newCart = cart.map((product) =>
				product.id === productId
					? {
							...product,
							amount: amount,
					  }
					: product
			);

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
