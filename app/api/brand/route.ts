import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let brandProfile = await db.brandProfile.findFirst();

    if (!brandProfile) {
      brandProfile = await db.brandProfile.create({
        data: {
          name: '我的品牌',
          intro: '',
          productLines: '',
          scenes: '',
          forbidden: '',
          sources: '',
        },
      });
    }

    return NextResponse.json(brandProfile);
  } catch (error) {
    console.error('[BRAND_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const values = await req.json();
    const brandProfile = await db.brandProfile.findFirst();

    if (!brandProfile) {
      return new NextResponse('Brand profile not found', { status: 404 });
    }

    const updatedProfile = await db.brandProfile.update({
      where: { id: brandProfile.id },
      data: { ...values },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('[BRAND_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
