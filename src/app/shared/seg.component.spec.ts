import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SegComponent, SegOption } from './seg.component';

@Component({
  imports: [SegComponent, ReactiveFormsModule],
  template: `<app-seg [options]="opts" [formControl]="ctrl" />`,
})
class HostComponent {
  opts: SegOption[] = [{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week', badge: 2 }];
  ctrl = new FormControl('today');
}

describe('SegComponent', () => {
  function setup() {
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    const buttons = () => Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    return { f, buttons };
  }

  it('marks the form value as the checked option', () => {
    const { buttons } = setup();
    expect(buttons().map(b => b.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('writes the tapped option back to the form control', () => {
    const { f, buttons } = setup();
    buttons()[1].click();
    f.detectChanges();
    expect(f.componentInstance.ctrl.value).toBe('week');
    expect(buttons()[1].classList).toContain('on');
  });

  it('shows a badge count and disables with the control', () => {
    const { f, buttons } = setup();
    expect(buttons()[1].textContent).toContain('2');
    f.componentInstance.ctrl.disable();
    f.detectChanges();
    expect(buttons().every(b => b.disabled)).toBe(true);
  });
});
