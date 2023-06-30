import Header from 'components/ui/Header';

type LayoutProps = {
  children?: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const contentHeight = 'calc(100vh - 114px)';
  return (
    <div className='h-screen'>
      <Header />
      <main className='bg-yellow-50' style={{height: contentHeight}}>{children}</main>
      {/* <Footer /> */}
    </div>
  );
}

export default Layout;