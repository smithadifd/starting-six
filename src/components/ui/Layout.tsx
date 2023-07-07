import Header from 'components/ui/Header';

type LayoutProps = {
  children?: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className='h-screen'>
      <Header />
      <main className='bg-yellow-50' style={{height: 'workspaceHeight'}}>{children}</main>
      {/* <Footer /> */}
    </div>
  );
}

export default Layout;