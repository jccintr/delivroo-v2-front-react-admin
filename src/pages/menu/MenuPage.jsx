import { useState } from 'react';
import { Categories, Groups, Products } from '../../api/index.js';
import { Loading, PageHeader, Tabs } from '../../components/ui.jsx';
import useResource from '../../hooks/useResource.js';
import CategoriesTab from './CategoriesTab.jsx';
import GroupsTab from './GroupsTab.jsx';
import ProductsTab from './ProductsTab.jsx';

export default function MenuPage() {
  const [tab, setTab] = useState('products');
  const { data, loading, error, reload } = useResource(async () => {
    const [categories, products, groups] = await Promise.all([Categories.list(), Products.list(), Groups.list()]);
    return { categories, products, groups };
  }, []);

  return (
    <>
      <PageHeader title="Cardápio" subtitle="Produtos, categorias e os grupos de adicionais e itens obrigatórios.">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'products', label: 'Produtos', count: data?.products.length },
          { key: 'categories', label: 'Categorias', count: data?.categories.length },
          { key: 'groups', label: 'Adicionais e obrigatórios', count: data?.groups.length },
        ]} />
      </PageHeader>
      {loading && !data ? <Loading /> : error && !data ? <p className="text-cherry">{error.message}</p> : (
        <>
          {tab === 'products' && <ProductsTab {...data} reload={reload} goto={setTab} />}
          {tab === 'categories' && <CategoriesTab {...data} reload={reload} />}
          {tab === 'groups' && <GroupsTab {...data} reload={reload} />}
        </>
      )}
    </>
  );
}
